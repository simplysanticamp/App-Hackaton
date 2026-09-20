// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ProjectPassport
/// @notice NFT soulbound (ERC-721 no transferible) que certifica un proyecto. Solo se puede mintear.
/// @dev Implementa ERC-5192 (`locked`). El metadata vive en `metadataURI` (IPFS/URL), nunca onchain.
contract ProjectPassport is ERC721URIStorage, Ownable {
    /// @notice El token es soulbound: cualquier transferencia, aprobación o quema revierte con este error.
    error Soulbound();
    /// @notice El llamante no es el founder ni el owner del contrato.
    error NotAuthorizedMinter();
    /// @notice El `metadataURI` está vacío.
    error EmptyMetadataURI();
    /// @notice Se pasó `address(0)` donde se requiere una dirección válida.
    error ZeroAddress();

    /// @notice ERC-5192: señala que el token queda permanentemente bloqueado al mintearse.
    /// @dev Se emite una sola vez por token, en el mint; nunca se emite `Unlocked`.
    event Locked(uint256 indexed tokenId);
    /// @notice Evento propio de Bootstrap, además del `Transfer` estándar de ERC-721.
    event PassportMinted(uint256 indexed tokenId, address indexed founder, string metadataURI);

    /// @notice Cantidad total de passports minteados. Como no se pueden quemar, es también el último tokenId.
    uint256 public totalSupply;

    /// @notice Despliega el Passport.
    /// @param initialOwner Dirección que recibe el ownership (puede mintear en nombre de un founder).
    constructor(address initialOwner) ERC721("Bootstrap Project Passport", "BPASS") Ownable(initialOwner) {}

    /// @notice Mintea un Project Passport soulbound. El founder puede mintear el suyo; el owner del
    ///         contrato puede mintearlo en su nombre (flujo asistido por el agente).
    /// @dev El nombre, descripción y categoría del proyecto viven en el JSON de `metadataURI`, nunca
    ///      onchain. Se usa `_mint` y no `_safeMint` a propósito: el token no se puede transferir, así que
    ///      no importa si el destinatario implementa `onERC721Received`.
    /// @param founder Dirección que será dueña del passport.
    /// @param metadataURI URI (IPFS/HTTPS) del JSON de metadata; no puede estar vacío.
    /// @return tokenId Id secuencial del passport minteado (empieza en 1).
    function mintPassport(address founder, string calldata metadataURI) external returns (uint256 tokenId) {
        if (founder == address(0)) revert ZeroAddress();
        if (msg.sender != founder && msg.sender != owner()) revert NotAuthorizedMinter();
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();

        // Effects antes de la interacción (_safeMint no se usa: el founder no necesita ser receptor).
        tokenId = ++totalSupply;
        // forge-lint: disable-next-line(unsafe-oz-erc721-mint)
        _mint(founder, tokenId); // el founder puede ser un contrato sin onERC721Received; no hay transfers
        _setTokenURI(tokenId, metadataURI);

        emit Locked(tokenId);
        emit PassportMinted(tokenId, founder, metadataURI);
    }

    /// @notice ERC-5192: indica si el token está bloqueado. Siempre `true`.
    /// @dev Revierte si el token no existe, como exige el estándar.
    /// @param tokenId Id del passport a consultar.
    /// @return Siempre `true`: un Project Passport nunca se desbloquea.
    function locked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    // --- Soulbound: solo se permite mint (from == address(0)) ---

    /// @dev Punto único por el que pasan mint, transfer y burn en OZ v5. Bloquear aquí hace que TODAS las
    ///      variantes de `transferFrom` y `safeTransferFrom` reviertan, sin poder saltarse por una ruta
    ///      alterna. Solo pasa el mint, donde el token aún no tiene dueño.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (_ownerOf(tokenId) != address(0)) revert Soulbound(); // bloquea transfer y burn
        return super._update(to, tokenId, auth);
    }

    /// @notice Deshabilitada: aprobar a un tercero no tiene sentido en un token intransferible.
    /// @dev Revierte siempre con `Soulbound`, para que ningún marketplace pueda tomar control del token.
    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert Soulbound();
    }

    /// @notice Deshabilitada: aprobar a un operador no tiene sentido en un token intransferible.
    /// @dev Revierte siempre con `Soulbound`.
    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert Soulbound();
    }

    /// @notice Soporte de interfaces ERC-165, incluyendo ERC-721, ERC-721Metadata y ERC-5192.
    /// @param interfaceId Id de interfaz a consultar.
    /// @return `true` si la interfaz está soportada.
    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage) returns (bool) {
        return interfaceId == 0xb45a3c0e /* ERC-5192 */ || super.supportsInterface(interfaceId);
    }
}
