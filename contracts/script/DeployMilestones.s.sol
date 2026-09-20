// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {console} from "forge-std/Script.sol";
import {DeployBase} from "./DeployBase.sol";
import {Milestones} from "../src/Milestones.sol";

/// @title DeployMilestones
/// @notice Despliega solo el registro de hitos, conectándolo a un ProjectPassport ya desplegado.
/// @dev Uso: forge script script/DeployMilestones.s.sol --rpc-url hsk_testnet --account <keystore> --broadcast
///      Variables: PASSPORT_ADDRESS (obligatoria), VALIDATOR (obligatoria), OWNER (obligatoria salvo que
///      se pase ADMIN), ADMIN (opcional, por defecto OWNER). Ver `DeployBase.sol`.
contract DeployMilestones is DeployBase {
    function run() external returns (Milestones milestones) {
        address passport = _passport();
        address validator = _validator();
        address admin = _adminOrOwner();

        vm.startBroadcast();
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
