// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ProjectPassport} from "../src/ProjectPassport.sol";
import {Milestones} from "../src/Milestones.sol";
import {FundingRegistry} from "../src/FundingRegistry.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

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
    bytes32 constant ADMIN_ROLE = 0x00; // DEFAULT_ADMIN_ROLE de OZ AccessControl

    // Se cachean en setUp: leerlos del contrato dentro de un test consumiría el `vm.prank` pendiente.
    bytes32 validatorRole;
    bytes32 recorderRole;

    function setUp() public {
        passport = new ProjectPassport(admin);
        milestones = new Milestones(address(passport), validator, admin);
        registry = new FundingRegistry(address(passport), admin);
        validatorRole = milestones.VALIDATOR_ROLE();
        recorderRole = registry.RECORDER_ROLE();
    }

    function _mint() internal returns (uint256) {
        vm.prank(founder);
        return passport.mintPassport(founder, URI);
    }

    function _unauthorized(address account, bytes32 role) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, account, role);
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
        assertEq(passport.getApproved(1), address(0));
        assertFalse(passport.isApprovedForAll(founder, other));
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
        vm.expectEmit(true, true, true, true);
        emit Milestones.MilestoneAdded(id, 0, founder, HASH, "MVP listo");
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

    function test_ValidatorCanAddMilestoneOnBehalf() public {
        uint256 id = _mint();
        vm.prank(validator);
        milestones.addMilestone(id, "Registrado por el validator", HASH);
        assertEq(milestones.milestoneCount(id), 1);
    }

    function test_GetMilestonesReturnsFullHistory() public {
        uint256 id = _mint();
        vm.startPrank(founder);
        milestones.addMilestone(id, "uno", HASH);
        milestones.addMilestone(id, "dos", keccak256("otra"));
        vm.stopPrank();

        Milestones.Milestone[] memory all = milestones.getMilestones(id);
        assertEq(all.length, 2);
        assertEq(all[0].description, "uno");
        assertEq(all[1].description, "dos");
        assertEq(milestones.getMilestones(999).length, 0);
    }

    function test_RevertWhen_NonOwnerAddsMilestone() public {
        uint256 id = _mint();
        vm.prank(other);
        vm.expectRevert(Milestones.NotAuthorized.selector);
        milestones.addMilestone(id, "x", HASH);
    }

    function test_RevertWhen_MilestoneOnMissingPassport() public {
        vm.prank(founder);
        vm.expectRevert();
        milestones.addMilestone(42, "x", HASH);
        // tampoco el validator puede inventar un passport
        vm.prank(validator);
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
        vm.expectRevert(_unauthorized(founder, validatorRole));
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
        // tokenId inexistente: no tiene hitos, así que tampoco se puede verificar
        vm.expectRevert(Milestones.MilestoneNotFound.selector);
        milestones.verifyMilestone(999, 0);
        vm.stopPrank();
    }

    function test_RevertWhen_GetMissingMilestone() public {
        uint256 id = _mint();
        vm.expectRevert(Milestones.MilestoneNotFound.selector);
        milestones.getMilestone(id, 0);
    }

    function test_AdminRotatesValidatorRole() public {
        uint256 id = _mint();
        vm.prank(founder);
        milestones.addMilestone(id, "MVP", HASH);

        bytes32 role = milestones.VALIDATOR_ROLE();
        vm.startPrank(admin);
        milestones.grantRole(role, other);
        milestones.revokeRole(role, validator);
        vm.stopPrank();

        assertTrue(milestones.hasRole(role, other));
        assertFalse(milestones.hasRole(role, validator));

        vm.prank(validator);
        vm.expectRevert(_unauthorized(validator, role));
        milestones.verifyMilestone(id, 0);

        vm.prank(other);
        milestones.verifyMilestone(id, 0);
        assertGt(milestones.getMilestone(id, 0).verifiedAt, 0);
    }

    function test_RevertWhen_NonAdminGrantsValidatorRole() public {
        vm.prank(other);
        vm.expectRevert(_unauthorized(other, ADMIN_ROLE));
        milestones.grantRole(validatorRole, other);
    }

    function test_RevertWhen_MilestonesConstructorZeroAddresses() public {
        vm.expectRevert(Milestones.ZeroAddress.selector);
        new Milestones(address(0), validator, admin);
        vm.expectRevert(Milestones.ZeroAddress.selector);
        new Milestones(address(passport), address(0), admin);
        vm.expectRevert(Milestones.ZeroAddress.selector);
        new Milestones(address(passport), validator, address(0));
    }

    function testFuzz_OnlyValidatorVerifies(address caller) public {
        vm.assume(caller != validator);
        uint256 id = _mint();
        vm.prank(founder);
        milestones.addMilestone(id, "MVP", HASH);
        vm.prank(caller);
        vm.expectRevert(_unauthorized(caller, validatorRole));
        milestones.verifyMilestone(id, 0);
    }

    // ---------- FundingRegistry ----------

    function test_RecordApplication() public {
        uint256 id = _mint();
        vm.expectEmit(true, true, true, true);
        emit FundingRegistry.FundingApplicationRecorded(id, 0, founder, "Grant X", FundingRegistry.Status.Submitted);
        vm.prank(founder);
        uint256 appId = registry.recordFundingApplication(id, "Grant X", FundingRegistry.Status.Submitted);
        assertEq(appId, 0);
        assertEq(registry.applicationCount(id), 1);

        FundingRegistry.Application memory a = registry.getApplication(id, 0);
        assertEq(a.opportunityName, "Grant X");
        assertEq(uint8(a.status), uint8(FundingRegistry.Status.Submitted));
        assertEq(a.recordedAt, block.timestamp);

        vm.prank(founder);
        assertEq(registry.recordFundingApplication(id, "Grant Y", FundingRegistry.Status.Rejected), 1);
        assertEq(registry.getApplications(id).length, 2);
    }

    function test_RecorderRoleCanRecordOnBehalf() public {
        uint256 id = _mint();
        vm.prank(admin);
        registry.grantRole(recorderRole, other);

        vm.prank(other);
        registry.recordFundingApplication(id, "Grant Z", FundingRegistry.Status.Pending);
        assertEq(registry.applicationCount(id), 1);
    }

    function test_RecordFundingReceived() public {
        uint256 id = _mint();
        address usdc = makeAddr("usdc");

        vm.expectEmit(true, true, true, true);
        emit FundingRegistry.FundingReceivedRecorded(id, 0, founder, 25_000e6, usdc);
        vm.prank(founder);
        uint256 recordId = registry.recordFundingReceived(id, 25_000e6, usdc);
        assertEq(recordId, 0);
        assertEq(registry.fundingReceivedCount(id), 1);

        FundingRegistry.FundingReceived memory f = registry.getFundingReceived(id, 0);
        assertEq(f.amount, 25_000e6);
        assertEq(f.token, usdc);
        assertEq(f.recordedAt, block.timestamp);

        // address(0) = moneda nativa de la red
        vm.prank(founder);
        registry.recordFundingReceived(id, 1 ether, address(0));
        assertEq(registry.getAllFundingReceived(id).length, 2);
        assertEq(registry.getAllFundingReceived(id)[1].token, address(0));

        // el registro no mueve dinero: el contrato nunca retiene saldo
        assertEq(address(registry).balance, 0);
    }

    function test_RevertWhen_RegistryInvalid() public {
        uint256 id = _mint();
        vm.prank(other);
        vm.expectRevert(FundingRegistry.NotAuthorized.selector);
        registry.recordFundingApplication(id, "Grant", FundingRegistry.Status.Submitted);

        vm.startPrank(founder);
        vm.expectRevert(FundingRegistry.EmptyOpportunityName.selector);
        registry.recordFundingApplication(id, "", FundingRegistry.Status.Submitted);
        vm.expectRevert(FundingRegistry.OpportunityNameTooLong.selector);
        registry.recordFundingApplication(id, string(new bytes(121)), FundingRegistry.Status.Submitted);
        vm.expectRevert(FundingRegistry.ZeroAmount.selector);
        registry.recordFundingReceived(id, 0, address(0));
        vm.expectRevert(FundingRegistry.RecordNotFound.selector);
        registry.getApplication(id, 0);
        vm.expectRevert(FundingRegistry.RecordNotFound.selector);
        registry.getFundingReceived(id, 0);
        vm.stopPrank();
    }

    function test_RevertWhen_RegistryOnMissingPassport() public {
        vm.startPrank(founder);
        vm.expectRevert();
        registry.recordFundingApplication(999, "Grant", FundingRegistry.Status.Submitted);
        vm.expectRevert();
        registry.recordFundingReceived(999, 1, address(0));
        vm.stopPrank();
    }

    function test_RevertWhen_NonOwnerRecordsFundingReceived() public {
        uint256 id = _mint();
        vm.prank(other);
        vm.expectRevert(FundingRegistry.NotAuthorized.selector);
        registry.recordFundingReceived(id, 1, address(0));
    }

    function test_RevertWhen_RegistryConstructorZeroAddresses() public {
        vm.expectRevert(FundingRegistry.ZeroAddress.selector);
        new FundingRegistry(address(0), admin);
        vm.expectRevert(FundingRegistry.ZeroAddress.selector);
        new FundingRegistry(address(passport), address(0));
    }

    /// @dev Con `Status` en la firma pública, el decodificador del ABI rechaza los valores fuera de rango
    ///      antes de ejecutar la función: no hace falta un check manual dentro del contrato.
    function testFuzz_StatusOutOfRangeRejectedByAbi(uint8 rawStatus) public {
        uint256 id = _mint();
        vm.prank(founder);
        (bool ok,) = address(registry)
            .call(abi.encodeWithSignature("recordFundingApplication(uint256,string,uint8)", id, "Grant", rawStatus));
        assertEq(ok, rawStatus <= uint8(FundingRegistry.Status.Rejected));
    }

    function testFuzz_FundingAmountRoundTrips(uint256 amount, address token) public {
        vm.assume(amount != 0);
        uint256 id = _mint();
        vm.prank(founder);
        registry.recordFundingReceived(id, amount, token);
        FundingRegistry.FundingReceived memory f = registry.getFundingReceived(id, 0);
        assertEq(f.amount, amount);
        assertEq(f.token, token);
    }
}
