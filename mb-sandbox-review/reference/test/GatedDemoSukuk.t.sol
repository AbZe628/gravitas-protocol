// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.24;

/*
 * REFERENCE IMPLEMENTATION TESTS, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION.
 * These tests deploy the existing registry source in an isolated local Foundry project.
 */
import {Test} from "forge-std/Test.sol";
import {GravitasPolicyRegistry} from "contracts/GravitasPolicyRegistry.sol";
import {GatedDemoSukuk} from "../src/GatedDemoSukuk.sol";
import {DemoSukukManager} from "../src/DemoSukukManager.sol";
import {MockERC20} from "contracts/MockERC20.sol";

contract GatedDemoSukukTest is Test {
    GravitasPolicyRegistry internal registry;
    GatedDemoSukuk internal token;
    DemoSukukManager internal manager;
    address internal constant HOLDER = address(0xA11CE);
    address internal constant RECIPIENT = address(0xB0B);
    address internal constant DELEGATE = address(0xD311);
    bytes32 internal constant REQUEST_ID = keccak256("review-request-01");
    uint256 internal constant INITIAL = 10_000 ether;
    uint256 internal constant TRANSFER_AMOUNT = 100 ether;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event TransferChecked(
        bytes32 indexed requestId,
        address indexed token,
        address from,
        address to,
        uint256 amount,
        uint256 policyVersion,
        bytes32 policyHash
    );

    function setUp() public {
        registry = new GravitasPolicyRegistry();
        manager = new DemoSukukManager(address(registry));
        // The token binds its manager in its constructor; the manager then accepts this
        // exact token once. The constructor mint is the only asset-check exception.
        token = new GatedDemoSukuk(address(registry), address(manager), HOLDER, INITIAL);
        manager.initializeToken(address(token));
        registry.setAssetCompliance(address(token), true);
        registry.setExecutorStatus(address(manager), true);
    }

    function _approveManager() internal {
        vm.prank(HOLDER);
        token.approve(address(manager), type(uint256).max);
    }

    function _managerTransfer() internal {
        vm.prank(HOLDER);
        manager.transferSukuk(REQUEST_ID, HOLDER, RECIPIENT, TRANSFER_AMOUNT);
    }

    function testScenario01_ApprovedManagerTransfersAndEmitsBothEventsInOrder() public {
        _approveManager();
        uint256 version = registry.getPolicyVersion();
        bytes32 policyHash = registry.policyHistory(version);
        vm.expectEmit(true, true, false, true, address(token));
        emit Transfer(HOLDER, RECIPIENT, TRANSFER_AMOUNT);
        vm.expectEmit(true, true, false, true, address(manager));
        emit TransferChecked(REQUEST_ID, address(token), HOLDER, RECIPIENT, TRANSFER_AMOUNT, version, policyHash);

        _managerTransfer();

        assertEq(token.balanceOf(HOLDER), INITIAL - TRANSFER_AMOUNT);
        assertEq(token.balanceOf(RECIPIENT), TRANSFER_AMOUNT);
        assertTrue(manager.processedRequestIds(REQUEST_ID));
    }

    function testScenario02_UnapprovedAssetRevertsAtomically() public {
        _approveManager();
        registry.setAssetCompliance(address(token), false);
        vm.expectRevert(bytes("GPR: Asset not Shariah-compliant"));
        _managerTransfer();
        assertEq(token.balanceOf(HOLDER), INITIAL);
        assertEq(token.balanceOf(RECIPIENT), 0);
        assertEq(token.allowance(HOLDER, address(manager)), type(uint256).max);
        assertFalse(manager.processedRequestIds(REQUEST_ID));
    }

    function testScenario03_UnregisteredBoundManagerCannotMoveItsToken() public {
        DemoSukukManager unregistered = new DemoSukukManager(address(registry));
        GatedDemoSukuk unregisteredToken = new GatedDemoSukuk(
            address(registry), address(unregistered), HOLDER, INITIAL
        );
        unregistered.initializeToken(address(unregisteredToken));
        registry.setAssetCompliance(address(unregisteredToken), true);
        vm.prank(HOLDER);
        unregisteredToken.approve(address(unregistered), type(uint256).max);

        vm.expectRevert(bytes("GPR: Calling contract not an authorized executor"));
        vm.prank(HOLDER);
        unregistered.transferSukuk(REQUEST_ID, HOLDER, RECIPIENT, TRANSFER_AMOUNT);

        assertEq(unregisteredToken.balanceOf(HOLDER), INITIAL);
        assertEq(unregisteredToken.balanceOf(RECIPIENT), 0);
        assertFalse(unregistered.processedRequestIds(REQUEST_ID));
    }

    function testScenario04_RevocationAndReapprovalAdvanceHashChain() public {
        _approveManager();
        uint256 approvedVersion = registry.getPolicyVersion();
        bytes32 priorHash = registry.policyHistory(approvedVersion);
        registry.setAssetCompliance(address(token), false);
        uint256 revokedVersion = approvedVersion + 1;
        bytes32 revokedHash = keccak256(abi.encode(priorHash, keccak256("asset"), address(token), false));
        assertEq(registry.getPolicyVersion(), revokedVersion);
        assertEq(registry.policyHistory(approvedVersion), priorHash);
        assertEq(registry.policyHistory(revokedVersion), revokedHash);

        vm.expectRevert(bytes("GPR: Asset not Shariah-compliant"));
        _managerTransfer();
        assertEq(token.balanceOf(HOLDER), INITIAL);
        assertEq(token.balanceOf(RECIPIENT), 0);

        registry.setAssetCompliance(address(token), true);
        uint256 reapprovedVersion = revokedVersion + 1;
        assertEq(registry.getPolicyVersion(), reapprovedVersion);
        vm.expectEmit(true, true, false, true, address(token));
        emit Transfer(HOLDER, RECIPIENT, TRANSFER_AMOUNT);
        vm.expectEmit(true, true, false, true, address(manager));
        emit TransferChecked(
            REQUEST_ID, address(token), HOLDER, RECIPIENT, TRANSFER_AMOUNT,
            reapprovedVersion, registry.policyHistory(reapprovedVersion)
        );
        _managerTransfer();
        assertEq(token.balanceOf(RECIPIENT), TRANSFER_AMOUNT);
    }

    function testScenario05_PauseBlocksAllStateChangesAndRecoveryWorks() public {
        _approveManager();
        registry.pause();
        vm.expectRevert(bytes4(keccak256("EnforcedPause()")));
        _managerTransfer();
        vm.prank(HOLDER);
        vm.expectRevert(bytes4(keccak256("EnforcedPause()")));
        token.transfer(RECIPIENT, TRANSFER_AMOUNT);
        assertEq(token.balanceOf(HOLDER), INITIAL);
        assertEq(token.balanceOf(RECIPIENT), 0);
        assertFalse(manager.processedRequestIds(REQUEST_ID));

        registry.unpause();
        _managerTransfer();
        assertEq(token.balanceOf(RECIPIENT), TRANSFER_AMOUNT);
    }

    function testScenario06_DirectTransferCannotBypassManagerWhenAssetIsApproved() public {
        uint256 holderBefore = token.balanceOf(HOLDER);
        uint256 recipientBefore = token.balanceOf(RECIPIENT);
        vm.prank(HOLDER);
        vm.expectRevert(bytes("GatedDemoSukuk: manager only"));
        token.transfer(RECIPIENT, TRANSFER_AMOUNT);
        assertEq(token.balanceOf(HOLDER), holderBefore);
        assertEq(token.balanceOf(RECIPIENT), recipientBefore);
        assertEq(token.totalSupply(), INITIAL);
    }

    function testScenario06_DelegatedTransferCannotBypassManagerEvenForRegisteredExecutor() public {
        registry.setExecutorStatus(DELEGATE, true);
        vm.prank(HOLDER);
        token.approve(DELEGATE, TRANSFER_AMOUNT);
        uint256 holderBefore = token.balanceOf(HOLDER);
        uint256 recipientBefore = token.balanceOf(RECIPIENT);

        vm.prank(DELEGATE);
        vm.expectRevert(bytes("GatedDemoSukuk: manager only"));
        token.transferFrom(HOLDER, RECIPIENT, TRANSFER_AMOUNT);

        assertEq(token.balanceOf(HOLDER), holderBefore);
        assertEq(token.balanceOf(RECIPIENT), recipientBefore);
        assertEq(token.allowance(HOLDER, DELEGATE), TRANSFER_AMOUNT);
    }

    function testScenario06_OnlyTheBoundManagerCanUseTransferFrom() public {
        _approveManager();
        vm.prank(HOLDER);
        token.approve(DELEGATE, TRANSFER_AMOUNT);
        vm.prank(DELEGATE);
        vm.expectRevert(bytes("GatedDemoSukuk: manager only"));
        token.transferFrom(HOLDER, RECIPIENT, TRANSFER_AMOUNT);
        assertEq(token.allowance(HOLDER, DELEGATE), TRANSFER_AMOUNT);

        _managerTransfer();
        assertEq(token.balanceOf(RECIPIENT), TRANSFER_AMOUNT);
    }

    function testFuzz_DirectTransferAlwaysRevertsWhenAssetIsApproved(address to, uint256 amount) public {
        vm.assume(to != address(0));
        uint256 holderBefore = token.balanceOf(HOLDER);
        uint256 recipientBefore = token.balanceOf(to);
        vm.prank(HOLDER);
        vm.expectRevert(bytes("GatedDemoSukuk: manager only"));
        token.transfer(to, amount);
        assertEq(token.balanceOf(HOLDER), holderBefore);
        assertEq(token.balanceOf(to), recipientBefore);
        assertEq(token.totalSupply(), INITIAL);
    }

    function testScenario07_PostDeploymentMintBurnAndConstructorExceptionRemainControlled() public {
        assertEq(token.balanceOf(HOLDER), INITIAL);
        assertEq(token.totalSupply(), INITIAL);
        token.mint(RECIPIENT, 1 ether);
        assertEq(token.balanceOf(RECIPIENT), 1 ether);

        vm.prank(HOLDER);
        vm.expectRevert(bytes("GatedDemoSukuk: caller is not issuer"));
        token.mint(RECIPIENT, 1 ether);

        registry.setAssetCompliance(address(token), false);
        vm.expectRevert(bytes("GatedDemoSukuk: asset not approved"));
        token.mint(RECIPIENT, 1 ether);
        vm.prank(HOLDER);
        vm.expectRevert(bytes("GatedDemoSukuk: asset not approved"));
        token.burn(1 ether);
        vm.prank(HOLDER);
        token.approve(DELEGATE, 1 ether);
        vm.prank(DELEGATE);
        vm.expectRevert(bytes("GatedDemoSukuk: asset not approved"));
        token.burnFrom(HOLDER, 1 ether);
        assertEq(token.balanceOf(HOLDER), INITIAL);
        assertEq(token.totalSupply(), INITIAL + 1 ether);

        registry.setAssetCompliance(address(token), true);
        vm.prank(HOLDER);
        token.burn(1 ether);
        vm.prank(HOLDER);
        token.approve(DELEGATE, 1 ether);
        vm.prank(DELEGATE);
        token.burnFrom(HOLDER, 1 ether);
        assertEq(token.balanceOf(HOLDER), INITIAL - 2 ether);
        assertEq(token.totalSupply(), INITIAL - 1 ether);
    }

    function testScenario07_OwnerHasNoDirectTransferBypass() public {
        token.mint(address(this), 5 ether);
        uint256 ownerBefore = token.balanceOf(address(this));
        vm.expectRevert(bytes("GatedDemoSukuk: manager only"));
        token.transfer(RECIPIENT, 1 ether);
        assertEq(token.balanceOf(address(this)), ownerBefore);
        assertEq(token.balanceOf(RECIPIENT), 0);
    }

    function testScenario07_RequestIdCannotBeReplayed() public {
        _approveManager();
        _managerTransfer();
        uint256 holderAfterFirst = token.balanceOf(HOLDER);
        uint256 recipientAfterFirst = token.balanceOf(RECIPIENT);
        vm.expectRevert(abi.encodeWithSelector(DemoSukukManager.RequestAlreadyProcessed.selector, REQUEST_ID));
        _managerTransfer();
        assertEq(token.balanceOf(HOLDER), holderAfterFirst);
        assertEq(token.balanceOf(RECIPIENT), recipientAfterFirst);
    }

    function testScenario07_OneTimeTokenBindingRejectsReplacementAndWrongToken() public {
        vm.expectRevert(DemoSukukManager.TokenAlreadyConfigured.selector);
        manager.initializeToken(address(token));

        DemoSukukManager otherManager = new DemoSukukManager(address(registry));
        MockERC20 plainToken = new MockERC20();
        vm.expectRevert(DemoSukukManager.InvalidToken.selector);
        otherManager.initializeToken(address(plainToken));
        assertEq(otherManager.gatedToken(), address(0));
    }

    function testScenario07_ManagerWithoutBoundTokenCannotTransfer() public {
        DemoSukukManager uninitialized = new DemoSukukManager(address(registry));
        vm.expectRevert(DemoSukukManager.TokenNotConfigured.selector);
        uninitialized.transferSukuk(REQUEST_ID, HOLDER, RECIPIENT, TRANSFER_AMOUNT);
    }

    function testScenario07_NoCodeRegistryOrManagerIsRejected() public {
        vm.expectRevert(GatedDemoSukuk.InvalidRegistry.selector);
        new GatedDemoSukuk(address(0xBEEF), address(manager), HOLDER, INITIAL);
        vm.expectRevert(GatedDemoSukuk.InvalidManager.selector);
        new GatedDemoSukuk(address(registry), address(0xBEEF), HOLDER, INITIAL);
        vm.expectRevert(DemoSukukManager.InvalidRegistry.selector);
        new DemoSukukManager(address(0xBEEF));
    }

    function testScenario07_ZeroAndDuplicateRequestIdsAreRejected() public {
        _approveManager();
        vm.prank(HOLDER);
        vm.expectRevert(DemoSukukManager.InvalidRequestId.selector);
        manager.transferSukuk(bytes32(0), HOLDER, RECIPIENT, TRANSFER_AMOUNT);
        _managerTransfer();
        uint256 holderAfterFirst = token.balanceOf(HOLDER);
        vm.expectRevert(abi.encodeWithSelector(DemoSukukManager.RequestAlreadyProcessed.selector, REQUEST_ID));
        _managerTransfer();
        assertEq(token.balanceOf(HOLDER), holderAfterFirst);
    }

    function testScenario07_ThirdPartyCannotRedirectHolderAllowance() public {
        _approveManager();
        uint256 holderBefore = token.balanceOf(HOLDER);
        uint256 recipientBefore = token.balanceOf(RECIPIENT);
        vm.prank(address(0xCAFE));
        vm.expectRevert(
            abi.encodeWithSelector(
                DemoSukukManager.CallerNotTokenOwner.selector, address(0xCAFE), HOLDER
            )
        );
        manager.transferSukuk(REQUEST_ID, HOLDER, RECIPIENT, TRANSFER_AMOUNT);
        assertEq(token.balanceOf(HOLDER), holderBefore);
        assertEq(token.balanceOf(RECIPIENT), recipientBefore);
        assertEq(token.allowance(HOLDER, address(manager)), type(uint256).max);
        assertFalse(manager.processedRequestIds(REQUEST_ID));
    }

    function testScenario07_PlainGusdRemainsOutsideReferenceTokenGate() public {
        MockERC20 plainGusd = new MockERC20();
        plainGusd.transfer(HOLDER, TRANSFER_AMOUNT);
        vm.prank(HOLDER);
        assertTrue(plainGusd.transfer(RECIPIENT, TRANSFER_AMOUNT));
        assertEq(plainGusd.balanceOf(RECIPIENT), TRANSFER_AMOUNT);
    }
}
