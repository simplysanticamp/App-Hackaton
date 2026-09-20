// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {console} from "forge-std/Script.sol";
import {DeployBase} from "./DeployBase.sol";
import {ProjectPassport} from "../src/ProjectPassport.sol";
import {Milestones} from "../src/Milestones.sol";
import {FundingRegistry} from "../src/FundingRegistry.sol";

/// @title Deploy
/// @notice Despliega los tres contratos en orden y los conecta (Milestones y FundingRegistry reciben la
///         dirección del ProjectPassport en su constructor). Imprime las tres direcciones al final.
/// @dev Uso (HSK testnet, chain id 133):
///        forge script script/Deploy.s.sol --rpc-url hsk_testnet --account <keystore> --broadcast --verify
///      Mainnet (177): igual pero `--rpc-url hsk_mainnet`, SOLO con confirmación explícita del usuario.
///      La clave privada NUNCA va en el repo ni en la línea de comandos: usar keystore
///      (`cast wallet import bootstrap-deployer --interactive`) y pasarlo con `--account`.
///
///      Variables de entorno:
///        OWNER     (obligatoria) — puede mintear passports.
///        VALIDATOR (obligatoria) — verifica hitos.
///        ADMIN     (opcional)    — `DEFAULT_ADMIN_ROLE`: otorga y revoca roles. Por defecto, OWNER.
///
///      OWNER es obligatoria a propósito: ver `DeployBase.sol`. Usar `msg.sender` como default dejó un
///      deploy con el owner en una dirección sin clave privada.
///
///      Separar ADMIN de OWNER y de VALIDATOR importa: `DEFAULT_ADMIN_ROLE` puede auto-otorgarse
///      `VALIDATOR_ROLE` y `RECORDER_ROLE`, así que si las tres son la misma EOA, filtrar esa clave
///      permite fabricar un historial "verificado" de cero. En producción, ADMIN debe ser un multisig.
contract Deploy is DeployBase {
    function run() external returns (ProjectPassport passport, Milestones milestones, FundingRegistry registry) {
        address validator = _validator();
        address owner = _owner();
        address admin = _admin(owner);

        vm.startBroadcast();
        passport = new ProjectPassport(owner);
        milestones = new Milestones(address(passport), validator, admin);
        registry = new FundingRegistry(address(passport), admin);
        vm.stopBroadcast();

        console.log("--- Bootstrap deployed ---");
        console.log("chainId        ", block.chainid);
        console.log("ProjectPassport", address(passport));
        console.log("Milestones     ", address(milestones));
        console.log("FundingRegistry", address(registry));
        console.log("owner (mintea) ", owner);
        console.log("admin (roles)  ", admin);
        console.log("validator      ", validator);
        if (admin == validator || admin == owner) {
            console.log("AVISO: admin comparte clave con owner/validator. En produccion, separar y usar multisig.");
        }
        console.log("--- .env del frontend (copiar/pegar) ---");
        console.log("PASSPORT_ADDRESS=%s", vm.toString(address(passport)));
        console.log("MILESTONES_ADDRESS=%s", vm.toString(address(milestones)));
        console.log("FUNDING_REGISTRY_ADDRESS=%s", vm.toString(address(registry)));
    }
}
