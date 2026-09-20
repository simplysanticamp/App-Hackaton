// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title FundingRegistry
/// @notice Registro AUTO-REPORTADO por el founder de sus aplicaciones a fondos. No prueba que la aplicación exista
///         ni que fue aceptada: certifica qué declaró el founder y cuándo. `recordFundingReceived` queda fuera del MVP.
contract FundingRegistry {
    error NotPassportOwner();
    error EmptyOpportunityName();
    error OpportunityNameTooLong();
    error InvalidStatus();

    enum Status {
        Draft, // 0
        Submitted, // 1
        UnderReview, // 2
        Accepted, // 3
        Rejected // 4
    }

    uint256 public constant MAX_NAME_BYTES = 120;

    IERC721 public immutable passport;

    event FundingApplicationRecorded(
        uint256 indexed tokenId, uint256 indexed applicationId, string opportunityName, Status status
    );

    mapping(uint256 tokenId => uint256) public applicationCount;

    constructor(address passport_) {
        passport = IERC721(passport_);
    }

    /// @notice Solo el dueño del Passport registra aplicaciones. Los datos viven en el evento (no en storage).
    function recordFundingApplication(uint256 tokenId, string calldata opportunityName, uint8 status)
        external
        returns (uint256 applicationId)
    {
        if (passport.ownerOf(tokenId) != msg.sender) revert NotPassportOwner();
        uint256 len = bytes(opportunityName).length;
        if (len == 0) revert EmptyOpportunityName();
        if (len > MAX_NAME_BYTES) revert OpportunityNameTooLong();
        if (status > uint8(Status.Rejected)) revert InvalidStatus();

        applicationId = applicationCount[tokenId]++;
        emit FundingApplicationRecorded(tokenId, applicationId, opportunityName, Status(status));
    }
}
