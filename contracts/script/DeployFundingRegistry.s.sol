// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {FundingRegistry} from "../src/FundingRegistry.sol";

/// @title DeployFundingRegistry
/// @notice Despliega solo el registro de financiación, conectándolo a un ProjectPassport ya desplegado.
/// @dev Uso: forge script script/DeployFundingRegistry.s.sol --rpc-url hsk_testnet --account <keystore> --broadcast
///      Variables: PASSPORT_ADDRESS (obligatoria), OWNER (opcional).
contract DeployFundingRegistry is Script {
    function run() external returns (FundingRegistry registry) {
        address passport = vm.envAddress("PASSPORT_ADDRESS");
        require(passport != address(0), "PASSPORT_ADDRESS requerida");

        vm.startBroadcast();
        address owner = vm.envOr("OWNER", msg.sender);
        registry = new FundingRegistry(passport, owner);
        vm.stopBroadcast();

        console.log("chainId        ", block.chainid);
        console.log("FundingRegistry", address(registry));
        console.log("passport       ", passport);
        console.log("admin          ", owner);
        console.log("FUNDING_REGISTRY_ADDRESS=%s", vm.toString(address(registry)));
    }
}
