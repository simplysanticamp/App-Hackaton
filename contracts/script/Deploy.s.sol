// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ProjectPassport} from "../src/ProjectPassport.sol";
import {Milestones} from "../src/Milestones.sol";
import {FundingRegistry} from "../src/FundingRegistry.sol";

/// @title Deploy
/// @notice Despliega los tres contratos en orden y los conecta (Milestones y FundingRegistry reciben la
///         dirección del ProjectPassport en su constructor). Imprime las tres direcciones al final.
/// @dev Uso (HSK testnet, chain id 133):
///        forge script script/Deploy.s.sol --rpc-url hsk_testnet --account <keystore> --broadcast --verify
///      Mainnet (177): igual pero `--rpc-url hsk_mainnet`, SOLO con confirmación explícita del usuario.
///      Variables de entorno: VALIDATOR (obligatoria), OWNER (opcional, por defecto el deployer).
///      La clave privada NUNCA va en el repo ni en la línea de comandos: usar keystore
///      (`cast wallet import bootstrap-deployer --interactive`) y pasarlo con `--account`.
contract Deploy is Script {
    function run() external returns (ProjectPassport passport, Milestones milestones, FundingRegistry registry) {
        address validator = vm.envAddress("VALIDATOR");
        require(validator != address(0), "VALIDATOR requerido");

        vm.startBroadcast();
        address owner = vm.envOr("OWNER", msg.sender);
        passport = new ProjectPassport(owner);
        milestones = new Milestones(address(passport), validator, owner);
        registry = new FundingRegistry(address(passport), owner);
        vm.stopBroadcast();

        console.log("--- Bootstrap deployed ---");
        console.log("chainId        ", block.chainid);
        console.log("ProjectPassport", address(passport));
        console.log("Milestones     ", address(milestones));
        console.log("FundingRegistry", address(registry));
        console.log("owner/admin    ", owner);
        console.log("validator      ", validator);
        console.log("--- .env del frontend (copiar/pegar) ---");
        console.log("PASSPORT_ADDRESS=%s", vm.toString(address(passport)));
        console.log("MILESTONES_ADDRESS=%s", vm.toString(address(milestones)));
        console.log("FUNDING_REGISTRY_ADDRESS=%s", vm.toString(address(registry)));
    }
}
