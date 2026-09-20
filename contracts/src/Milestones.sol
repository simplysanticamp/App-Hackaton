// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Milestones
/// @notice Registro de hitos de un Passport. Solo se guarda el hash de la evidencia, nunca el archivo.
/// @dev Demo: un único `validator` verifica. En producción debe ser un multisig / attestation descentralizada.
contract Milestones is Ownable {
    error NotPassportOwner();
    error NotValidator();
    error EmptyDescription();
    error DescriptionTooLong();
    error EmptyEvidenceHash();
    error MilestoneNotFound();
    error AlreadyVerified();
    error ZeroAddress();

    uint256 public constant MAX_DESCRIPTION_BYTES = 280;

    struct Milestone {
        string description;
        bytes32 evidenceHash;
        uint64 createdAt;
        uint64 verifiedAt; // 0 = sin verificar
    }

    IERC721 public immutable passport;
    address public validator;

    mapping(uint256 tokenId => Milestone[]) private _milestones;

    event MilestoneAdded(
        uint256 indexed tokenId, uint256 indexed milestoneId, bytes32 evidenceHash, string description
    );
    event MilestoneVerified(uint256 indexed tokenId, uint256 indexed milestoneId, address indexed validator);
    event ValidatorUpdated(address indexed previousValidator, address indexed newValidator);

    constructor(address passport_, address validator_, address initialOwner) Ownable(initialOwner) {
        if (passport_ == address(0) || validator_ == address(0)) revert ZeroAddress();
        passport = IERC721(passport_);
        validator = validator_;
        emit ValidatorUpdated(address(0), validator_);
    }

    /// @notice Solo el dueño del Passport agrega hitos.
    function addMilestone(uint256 tokenId, string calldata description, bytes32 evidenceHash)
        external
        returns (uint256 milestoneId)
    {
        if (passport.ownerOf(tokenId) != msg.sender) revert NotPassportOwner(); // revierte si no existe
        uint256 len = bytes(description).length;
        if (len == 0) revert EmptyDescription();
        if (len > MAX_DESCRIPTION_BYTES) revert DescriptionTooLong();
        if (evidenceHash == bytes32(0)) revert EmptyEvidenceHash();

        milestoneId = _milestones[tokenId].length;
        _milestones[tokenId].push(
            Milestone({
                description: description,
                evidenceHash: evidenceHash,
                // forge-lint: disable-next-line(unsafe-typecast)
                createdAt: uint64(block.timestamp),
                verifiedAt: 0
            })
        );
        emit MilestoneAdded(tokenId, milestoneId, evidenceHash, description);
    }

    /// @notice Solo el validator marca un hito como verificado.
    function verifyMilestone(uint256 tokenId, uint256 milestoneId) external {
        if (msg.sender != validator) revert NotValidator();
        if (milestoneId >= _milestones[tokenId].length) revert MilestoneNotFound();
        Milestone storage m = _milestones[tokenId][milestoneId];
        if (m.verifiedAt != 0) revert AlreadyVerified();

        // forge-lint: disable-next-line(unsafe-typecast)
        m.verifiedAt = uint64(block.timestamp);
        emit MilestoneVerified(tokenId, milestoneId, msg.sender);
    }

    function setValidator(address newValidator) external onlyOwner {
        if (newValidator == address(0)) revert ZeroAddress();
        emit ValidatorUpdated(validator, newValidator);
        validator = newValidator;
    }

    function milestoneCount(uint256 tokenId) external view returns (uint256) {
        return _milestones[tokenId].length;
    }

    function getMilestone(uint256 tokenId, uint256 milestoneId) external view returns (Milestone memory) {
        if (milestoneId >= _milestones[tokenId].length) revert MilestoneNotFound();
        return _milestones[tokenId][milestoneId];
    }
}
