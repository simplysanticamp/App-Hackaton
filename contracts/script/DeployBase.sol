// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";

/// @title DeployBase
/// @notice Lectura y validación de la configuración común a los scripts de deploy.
/// @dev `msg.sender` NO sirve como valor por defecto para OWNER/ADMIN. Dentro del frame del script,
///      `msg.sender` es el caller por defecto de forge, no el firmante que sale de `--account`; solo
///      coincide si se pasa `--sender`. Un deploy real en HSK testnet (133) quedó con
///      `owner = 0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38` — que es
///      `keccak256("foundry default caller")`, una dirección sin clave privada. Resultado: el `owner` del
///      Passport y el `DEFAULT_ADMIN_ROLE` de Milestones/FundingRegistry quedaron inalcanzables para
///      siempre, sin forma de rotar roles a un multisig salvo redesplegar.
///      Por eso OWNER es obligatoria y esa dirección se rechaza explícitamente.
abstract contract DeployBase is Script {
    /// @dev Sender por defecto de forge cuando no se pasa `--sender`. No existe clave privada para ella.
    address public constant FOUNDRY_DEFAULT_SENDER = 0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38;

    /// @notice Revierte si la dirección es inservible como titular de owner/roles.
    function _requireUsable(address account, string memory name) internal pure {
        require(account != address(0), string.concat(name, " requerido"));
        require(
            account != FOUNDRY_DEFAULT_SENDER,
            string.concat(name, ": es el sender por defecto de forge, no tiene clave privada. Pasala explicita.")
        );
    }

    /// @notice Owner del Passport. Obligatoria: nunca cae a `msg.sender`.
    function _owner() internal view returns (address owner) {
        owner = vm.envAddress("OWNER");
        _requireUsable(owner, "OWNER");
    }

    /// @notice `DEFAULT_ADMIN_ROLE`. Por defecto, el OWNER.
    function _admin(address owner) internal view returns (address admin) {
        admin = vm.envOr("ADMIN", owner);
        _requireUsable(admin, "ADMIN");
    }

    /// @notice `DEFAULT_ADMIN_ROLE` para los scripts individuales, que no despliegan el Passport y por lo
    ///         tanto no necesitan OWNER si ya se pasó ADMIN.
    function _adminOrOwner() internal view returns (address admin) {
        admin = vm.envOr("ADMIN", address(0));
        if (admin == address(0)) admin = vm.envAddress("OWNER");
        _requireUsable(admin, "ADMIN");
    }

    /// @notice Dirección que recibe `VALIDATOR_ROLE`.
    function _validator() internal view returns (address validator) {
        validator = vm.envAddress("VALIDATOR");
        _requireUsable(validator, "VALIDATOR");
    }

    /// @notice Passport ya desplegado al que se conectan Milestones y FundingRegistry.
    function _passport() internal view returns (address passport) {
        passport = vm.envAddress("PASSPORT_ADDRESS");
        require(passport != address(0), "PASSPORT_ADDRESS requerida");
    }
}
