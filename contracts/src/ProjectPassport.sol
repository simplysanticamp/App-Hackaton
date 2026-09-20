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
    error Soulbound();
    error NotAuthorizedMinter();
    error EmptyMetadataURI();
    error ZeroAddress();

    /// @dev ERC-5192
    event Locked(uint256 indexed tokenId);
    event PassportMinted(uint256 indexed tokenId, address indexed founder, string metadataURI);

    uint256 public totalSupply;

    constructor(address initialOwner) ERC721("Bootstrap Project Passport", "BPASS") Ownable(initialOwner) {}

    /// @notice El founder mintea su propio passport; el owner (backend/validator) puede mintear en su nombre.
    /// @return tokenId id secuencial (empieza en 1)
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

    /// @notice ERC-5192: siempre bloqueado. Revierte si el token no existe.
    function locked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    // --- Soulbound: solo se permite mint (from == address(0)) ---

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (_ownerOf(tokenId) != address(0)) revert Soulbound(); // bloquea transfer y burn
        return super._update(to, tokenId, auth);
    }

    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert Soulbound();
    }

    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert Soulbound();
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage) returns (bool) {
        return interfaceId == 0xb45a3c0e /* ERC-5192 */ || super.supportsInterface(interfaceId);
    }
}
