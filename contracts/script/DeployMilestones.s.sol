// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {Milestones} from "../src/Milestones.sol";

/// @title DeployMilestones
/// @notice Despliega solo el registro de hitos, conectándolo a un ProjectPassport ya desplegado.
/// @dev Uso: forge script script/DeployMilestones.s.sol --rpc-url hsk_testnet --account <keystore> --broadcast
///      Variables: PASSPORT_ADDRESS (obligatoria), VALIDATOR (obligatoria), ADMIN/OWNER (opcionales).
contract DeployMilestones is Script {
    function run() external returns (Milestones milestones) {
        address passport = vm.envAddress("PASSPORT_ADDRESS");
        address validator = vm.envAddress("VALIDATOR");
        require(passport != address(0), "PASSPORT_ADDRESS requerida");
        require(validator != address(0), "VALIDATOR requerido");

        vm.startBroadcast();
        address admin = vm.envOr("ADMIN", vm.envOr("OWNER", msg.sender));
        milestones = new Milestones(passport, validator, admin);
        vm.stopBroadcast();

        console.log("chainId   ", block.chainid);
        console.log("Milestones", address(milestones));
        console.log("passport  ", passport);
        console.log("validator ", validator);
        console.log("admin     ", admin);
        console.log("MILESTONES_ADDRESS=%s", vm.toString(address(milestones)));
    }
}
