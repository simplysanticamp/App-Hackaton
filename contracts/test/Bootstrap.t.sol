// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ProjectPassport} from "../src/ProjectPassport.sol";
import {Milestones} from "../src/Milestones.sol";
import {FundingRegistry} from "../src/FundingRegistry.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract BootstrapTest is Test {
    ProjectPassport passport;
    Milestones milestones;
    FundingRegistry registry;

    address admin = makeAddr("admin");
    address validator = makeAddr("validator");
    address founder = makeAddr("founder");
    address other = makeAddr("other");

    string constant URI = "ipfs://bafy-demo";
    bytes32 constant HASH = keccak256("evidence");

    function setUp() public {
        passport = new ProjectPassport(admin);
        milestones = new Milestones(address(passport), validator, admin);
        registry = new FundingRegistry(address(passport));
    }

    function _mint() internal returns (uint256) {
        vm.prank(founder);
        return passport.mintPassport(founder, URI);
    }

    // ---------- ProjectPassport ----------

    function test_MintByFounder() public {
        vm.expectEmit(true, true, false, true);
        emit ProjectPassport.PassportMinted(1, founder, URI);
        uint256 id = _mint();
        assertEq(id, 1);
        assertEq(passport.ownerOf(1), founder);
        assertEq(passport.tokenURI(1), URI);
        assertEq(passport.totalSupply(), 1);
        assertTrue(passport.locked(1));
    }

    function test_OwnerCanMintOnBehalf() public {
        vm.prank(admin);
        passport.mintPassport(founder, URI);
        assertEq(passport.ownerOf(1), founder);
    }

    function test_RevertWhen_StrangerMintsForOther() public {
        vm.prank(other);
        vm.expectRevert(ProjectPassport.NotAuthorizedMinter.selector);
        passport.mintPassport(founder, URI);
    }

    function test_RevertWhen_EmptyURI() public {
        vm.prank(founder);
        vm.expectRevert(ProjectPassport.EmptyMetadataURI.selector);
        passport.mintPassport(founder, "");
    }

    function test_RevertWhen_MintToZero() public {
        vm.prank(admin);
        vm.expectRevert(ProjectPassport.ZeroAddress.selector);
        passport.mintPassport(address(0), URI);
    }

    function test_Soulbound_TransferReverts() public {
        _mint();
        vm.startPrank(founder);
        vm.expectRevert(ProjectPassport.Soulbound.selector);
        passport.transferFrom(founder, other, 1);
        vm.expectRevert(ProjectPassport.Soulbound.selector);
        passport.safeTransferFrom(founder, other, 1);
        vm.expectRevert(ProjectPassport.Soulbound.selector);
        passport.safeTransferFrom(founder, other, 1, "");
        vm.stopPrank();
        assertEq(passport.ownerOf(1), founder);
    }

    function test_Soulbound_ApprovalsRevert() public {
        _mint();
        vm.startPrank(founder);
        vm.expectRevert(ProjectPassport.Soulbound.selector);
        passport.approve(other, 1);
        vm.expectRevert(ProjectPassport.Soulbound.selector);
        passport.setApprovalForAll(other, true);
        vm.stopPrank();
    }

    function test_LockedRevertsForMissingToken() public {
        vm.expectRevert();
        passport.locked(99);
    }

    function test_SupportsERC5192() public view {
        assertTrue(passport.supportsInterface(0xb45a3c0e));
        assertTrue(passport.supportsInterface(0x80ac58cd)); // ERC-721
    }

    function testFuzz_SoulboundNoTransferAnyone(address caller, address to) public {
        _mint();
        vm.assume(to != address(0));
        vm.prank(caller);
        vm.expectRevert();
        passport.transferFrom(founder, to, 1);
        assertEq(passport.ownerOf(1), founder);
    }

    // ---------- Milestones ----------

    function test_AddMilestone() public {
        uint256 id = _mint();
        vm.expectEmit(true, true, false, true);
        emit Milestones.MilestoneAdded(id, 0, HASH, "MVP listo");
        vm.prank(founder);
        uint256 mid = milestones.addMilestone(id, "MVP listo", HASH);
        assertEq(mid, 0);
        assertEq(milestones.milestoneCount(id), 1);
        Milestones.Milestone memory m = milestones.getMilestone(id, 0);
        assertEq(m.description, "MVP listo");
        assertEq(m.evidenceHash, HASH);
        assertEq(m.createdAt, block.timestamp);
        assertEq(m.verifiedAt, 0);
    }

    function test_RevertWhen_NonOwnerAddsMilestone() public {
        uint256 id = _mint();
        vm.prank(other);
        vm.expectRevert(Milestones.NotPassportOwner.selector);
        milestones.addMilestone(id, "x", HASH);
    }

    function test_RevertWhen_MilestoneOnMissingPassport() public {
        vm.prank(founder);
        vm.expectRevert();
        milestones.addMilestone(42, "x", HASH);
    }

    function test_RevertWhen_InvalidMilestoneInput() public {
        uint256 id = _mint();
        vm.startPrank(founder);
        vm.expectRevert(Milestones.EmptyDescription.selector);
        milestones.addMilestone(id, "", HASH);
        vm.expectRevert(Milestones.EmptyEvidenceHash.selector);
        milestones.addMilestone(id, "x", bytes32(0));
        vm.expectRevert(Milestones.DescriptionTooLong.selector);
        milestones.addMilestone(id, string(new bytes(281)), HASH);
        vm.stopPrank();
    }

    function test_VerifyMilestone() public {
        uint256 id = _mint();
        vm.prank(founder);
        milestones.addMilestone(id, "MVP", HASH);

        vm.warp(block.timestamp + 1 days);
        vm.expectEmit(true, true, true, true);
        emit Milestones.MilestoneVerified(id, 0, validator);
        vm.prank(validator);
        milestones.verifyMilestone(id, 0);

        assertEq(milestones.getMilestone(id, 0).verifiedAt, block.timestamp);
    }

    function test_RevertWhen_NonValidatorVerifies() public {
        uint256 id = _mint();
        vm.prank(founder);
        milestones.addMilestone(id, "MVP", HASH);
        // ni siquiera el founder puede autoverificarse
        vm.prank(founder);
        vm.expectRevert(Milestones.NotValidator.selector);
        milestones.verifyMilestone(id, 0);
    }

    function test_RevertWhen_VerifyTwiceOrMissing() public {
        uint256 id = _mint();
        vm.prank(founder);
        milestones.addMilestone(id, "MVP", HASH);
        vm.startPrank(validator);
        milestones.verifyMilestone(id, 0);
        vm.expectRevert(Milestones.AlreadyVerified.selector);
        milestones.verifyMilestone(id, 0);
        vm.expectRevert(Milestones.MilestoneNotFound.selector);
        milestones.verifyMilestone(id, 5);
        vm.stopPrank();
    }

    function test_SetValidator() public {
        vm.prank(admin);
        milestones.setValidator(other);
        assertEq(milestones.validator(), other);
    }

    function test_RevertWhen_SetValidatorUnauthorizedOrZero() public {
        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, other));
        milestones.setValidator(other);
        vm.prank(admin);
        vm.expectRevert(Milestones.ZeroAddress.selector);
        milestones.setValidator(address(0));
    }

    function test_RevertWhen_ConstructorZeroAddresses() public {
        vm.expectRevert(Milestones.ZeroAddress.selector);
        new Milestones(address(0), validator, admin);
        vm.expectRevert(Milestones.ZeroAddress.selector);
        new Milestones(address(passport), address(0), admin);
    }

    function testFuzz_OnlyValidatorVerifies(address caller) public {
        vm.assume(caller != validator);
        uint256 id = _mint();
        vm.prank(founder);
        milestones.addMilestone(id, "MVP", HASH);
        vm.prank(caller);
        vm.expectRevert(Milestones.NotValidator.selector);
        milestones.verifyMilestone(id, 0);
    }

    // ---------- FundingRegistry ----------

    function test_RecordApplication() public {
        uint256 id = _mint();
        vm.expectEmit(true, true, false, true);
        emit FundingRegistry.FundingApplicationRecorded(id, 0, "Grant X", FundingRegistry.Status.Submitted);
        vm.prank(founder);
        uint256 appId = registry.recordFundingApplication(id, "Grant X", 1);
        assertEq(appId, 0);
        assertEq(registry.applicationCount(id), 1);

        vm.prank(founder);
        assertEq(registry.recordFundingApplication(id, "Grant Y", 4), 1);
    }

    function test_RevertWhen_RegistryInvalid() public {
        uint256 id = _mint();
        vm.prank(other);
        vm.expectRevert(FundingRegistry.NotPassportOwner.selector);
        registry.recordFundingApplication(id, "Grant", 1);

        vm.startPrank(founder);
        vm.expectRevert(FundingRegistry.EmptyOpportunityName.selector);
        registry.recordFundingApplication(id, "", 1);
        vm.expectRevert(FundingRegistry.OpportunityNameTooLong.selector);
        registry.recordFundingApplication(id, string(new bytes(121)), 1);
        vm.expectRevert(FundingRegistry.InvalidStatus.selector);
        registry.recordFundingApplication(id, "Grant", 5);
        vm.stopPrank();
    }

    function testFuzz_StatusBounds(uint8 status) public {
        uint256 id = _mint();
        vm.prank(founder);
        if (status > 4) vm.expectRevert(FundingRegistry.InvalidStatus.selector);
        registry.recordFundingApplication(id, "Grant", status);
    }
}
