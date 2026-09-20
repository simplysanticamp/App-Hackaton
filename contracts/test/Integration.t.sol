// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Deploy} from "../script/Deploy.s.sol";
import {ProjectPassport} from "../src/ProjectPassport.sol";
import {Milestones} from "../src/Milestones.sol";
import {FundingRegistry} from "../src/FundingRegistry.sol";

/// @notice Flujo completo de Bootstrap end-to-end, tal como lo hará la demo:
///         mintear passport → agregar hito con hash de evidencia → verificarlo → registrar aplicación a
///         una convocatoria → reportar financiación recibida → leer todo como lo leería un financiador.
contract IntegrationTest is Test {
    ProjectPassport passport;
    Milestones milestones;
    FundingRegistry registry;

    address admin = makeAddr("admin");
    address validator = makeAddr("validator");
    address founder = makeAddr("founder");
    address grantor = makeAddr("grantor");

    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // USDC de Base Sepolia (x402)

    function setUp() public {
        passport = new ProjectPassport(admin);
        milestones = new Milestones(address(passport), validator, admin);
        registry = new FundingRegistry(address(passport), admin);
    }

    function test_FullFlow_IdeaToFundedProject() public {
        // 1. El founder mintea su Project Passport. La metadata (nombre, descripción, categoría) va en IPFS.
        vm.prank(founder);
        uint256 tokenId = passport.mintPassport(founder, "ipfs://bafyProjectPassportMetadata");

        assertEq(tokenId, 1);
        assertEq(passport.ownerOf(tokenId), founder);
        assertTrue(passport.locked(tokenId), "el passport debe nacer bloqueado");

        // 2. El founder registra un hito. Solo sube el hash: el archivo nunca toca la cadena.
        bytes32 evidenceHash = keccak256(bytes("mvp-demo-v1.pdf"));
        vm.prank(founder);
        uint256 milestoneId = milestones.addMilestone(tokenId, "MVP desplegado y demo grabada", evidenceHash);

        assertEq(milestoneId, 0);
        assertEq(milestones.getMilestone(tokenId, milestoneId).verifiedAt, 0, "nace sin verificar");

        // 3. Pasa el tiempo y el validator lo verifica. El founder no puede autoverificarse.
        vm.warp(block.timestamp + 3 days);
        vm.prank(validator);
        milestones.verifyMilestone(tokenId, milestoneId);

        Milestones.Milestone memory m = milestones.getMilestone(tokenId, milestoneId);
        assertEq(m.evidenceHash, evidenceHash);
        assertEq(m.verifiedAt, block.timestamp);
        assertLt(m.createdAt, m.verifiedAt, "verificado despues de creado");

        // 4. El founder registra que aplicó a una convocatoria y, más tarde, que fue aceptada.
        vm.prank(founder);
        uint256 appId =
            registry.recordFundingApplication(tokenId, "iNNpulsa Aldea 2026", FundingRegistry.Status.Submitted);
        assertEq(appId, 0);

        vm.warp(block.timestamp + 30 days);
        vm.prank(founder);
        registry.recordFundingApplication(tokenId, "iNNpulsa Aldea 2026", FundingRegistry.Status.Accepted);

        // 5. Reporta la financiación recibida. El contrato NO custodia ni mueve un peso.
        vm.prank(founder);
        registry.recordFundingReceived(tokenId, 50_000e6, USDC);
        assertEq(address(registry).balance, 0, "FundingRegistry no custodia fondos");

        // 6. Un financiador lee el historial completo sin pedirle nada al founder.
        vm.startPrank(grantor);
        Milestones.Milestone[] memory history = milestones.getMilestones(tokenId);
        FundingRegistry.Application[] memory apps = registry.getApplications(tokenId);
        FundingRegistry.FundingReceived[] memory funds = registry.getAllFundingReceived(tokenId);
        vm.stopPrank();

        assertEq(history.length, 1);
        assertGt(history[0].verifiedAt, 0, "el hito figura verificado");
        // La tesis del producto: onchain consta que lo declaró el founder y que lo atestiguó otro.
        assertEq(history[0].author, founder, "lo declaro el founder");
        assertEq(apps[0].author, founder);

        assertEq(apps.length, 2, "historial completo: enviada y aceptada");
        assertEq(uint8(apps[0].status), uint8(FundingRegistry.Status.Submitted));
        assertEq(uint8(apps[1].status), uint8(FundingRegistry.Status.Accepted));
        assertLt(apps[0].recordedAt, apps[1].recordedAt);

        assertEq(funds.length, 1);
        assertEq(funds[0].amount, 50_000e6);
        assertEq(funds[0].token, USDC);

        // 7. Cerrado el ciclo, el passport sigue siendo intransferible: no se puede vender un historial.
        vm.prank(founder);
        vm.expectRevert(ProjectPassport.Soulbound.selector);
        passport.transferFrom(founder, grantor, tokenId);
    }

    /// @notice El script combinado despliega y conecta los tres contratos, y rechaza una config inservible.
    /// @dev Todo en un solo test a propósito: `vm.setEnv` escribe en el entorno del proceso, que es
    ///      compartido, y forge corre los tests de un mismo contrato en paralelo. Repartir estos casos en
    ///      varias funciones los hace competir por la misma variable OWNER.
    function test_DeployScriptWiresContracts() public {
        vm.setEnv("VALIDATOR", vm.toString(validator));
        vm.setEnv("OWNER", vm.toString(admin));

        Deploy script = new Deploy();
        (ProjectPassport p, Milestones ms, FundingRegistry fr) = script.run();

        assertEq(address(ms.passport()), address(p), "Milestones apunta al Passport");
        assertEq(address(fr.passport()), address(p), "FundingRegistry apunta al Passport");
        assertTrue(ms.hasRole(ms.VALIDATOR_ROLE(), validator));
        assertTrue(ms.hasRole(ms.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(fr.hasRole(fr.DEFAULT_ADMIN_ROLE(), admin));
        assertEq(p.owner(), admin);

        // El sender por defecto de forge se rechaza. No es hipotético: un deploy en HSK testnet quedó con
        // el `owner` en esa dirección, que no tiene clave privada, y dejó el `DEFAULT_ADMIN_ROLE`
        // inalcanzable para siempre.
        vm.setEnv("OWNER", vm.toString(script.FOUNDRY_DEFAULT_SENDER()));
        vm.expectRevert(bytes("OWNER: es el sender por defecto de forge, no tiene clave privada. Pasala explicita."));
        script.run();

        // Y OWNER es obligatoria: sin ella no se despliega nada.
        vm.setEnv("OWNER", "");
        vm.expectRevert();
        script.run();
    }
}
