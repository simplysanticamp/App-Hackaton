// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {console} from "forge-std/Script.sol";
import {DeployBase} from "./DeployBase.sol";
import {FundingRegistry} from "../src/FundingRegistry.sol";

/// @title DeployFundingRegistry
/// @notice Despliega solo el registro de financiación, conectándolo a un ProjectPassport ya desplegado.
/// @dev Uso: forge script script/DeployFundingRegistry.s.sol --rpc-url hsk_testnet --account <keystore> --broadcast
///      Variables: PASSPORT_ADDRESS (obligatoria), OWNER (obligatoria salvo que se pase ADMIN), ADMIN
///      (opcional, por defecto OWNER). Ver `DeployBase.sol`.
contract DeployFundingRegistry is DeployBase {
    function run() external returns (FundingRegistry registry) {
        address passport = _passport();
        address admin = _adminOrOwner();

        vm.startBroadcast();
        registry = new FundingRegistry(passport, admin);
        vm.stopBroadcast();

        console.log("chainId        ", block.chainid);
        console.log("FundingRegistry", address(registry));
        console.log("passport       ", passport);
        console.log("admin          ", admin);
        console.log("FUNDING_REGISTRY_ADDRESS=%s", vm.toString(address(registry)));
    }
}
