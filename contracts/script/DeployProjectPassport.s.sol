// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ProjectPassport} from "../src/ProjectPassport.sol";

/// @title DeployProjectPassport
/// @notice Despliega solo el ProjectPassport. Es el primer contrato: los otros dos necesitan su dirección.
/// @dev Uso: forge script script/DeployProjectPassport.s.sol --rpc-url hsk_testnet --account <keystore> --broadcast
///      Variables: OWNER (opcional, por defecto el deployer).
contract DeployProjectPassport is Script {
    function run() external returns (ProjectPassport passport) {
        vm.startBroadcast();
        address owner = vm.envOr("OWNER", msg.sender);
        passport = new ProjectPassport(owner);
        vm.stopBroadcast();

        console.log("chainId        ", block.chainid);
        console.log("ProjectPassport", address(passport));
        console.log("owner          ", owner);
        console.log("PASSPORT_ADDRESS=%s", vm.toString(address(passport)));
    }
}
