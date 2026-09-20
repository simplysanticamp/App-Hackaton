// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ProjectPassport} from "../src/ProjectPassport.sol";
import {Milestones} from "../src/Milestones.sol";
import {FundingRegistry} from "../src/FundingRegistry.sol";

/// Uso (testnet 133):
///   forge script script/Deploy.s.sol --rpc-url hsk_testnet --account <keystore> --broadcast
/// Mainnet (177): misma llamada con --rpc-url hsk_mainnet, SOLO con confirmación explícita.
/// Variables: VALIDATOR (dirección que verifica hitos), OWNER (opcional; por defecto el deployer).
/// La clave privada NUNCA va en el repo: usar keystore (`cast wallet import`) con --account.
contract Deploy is Script {
    function run() external returns (ProjectPassport passport, Milestones milestones, FundingRegistry registry) {
        address validator = vm.envAddress("VALIDATOR");
        require(validator != address(0), "VALIDATOR requerido");

        vm.startBroadcast();
        address owner = vm.envOr("OWNER", msg.sender);
        passport = new ProjectPassport(owner);
        milestones = new Milestones(address(passport), validator, owner);
        registry = new FundingRegistry(address(passport));
        vm.stopBroadcast();

        console.log("chainId", block.chainid);
        console.log("ProjectPassport", address(passport));
        console.log("Milestones", address(milestones));
        console.log("FundingRegistry", address(registry));
        console.log("owner", owner);
        console.log("validator", validator);
    }
}
