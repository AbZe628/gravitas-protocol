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
        // The token is created before it can be whitelisted; only this constructor mint is exempt.
        token = new GatedDemoSukuk(address(registry), HOLDER, INITIAL);
        manager = new DemoSukukManager(address(registry));
        registry.setAssetCompliance(address(token), true);
        registry.setExecutorStatus(address(manager), true);
    }

    function _approveManager() internal {
        vm.prank(HOLDER);
        token.approve(address(manager), type(uint256).max);
    }

    function _managerTransfer() internal {
        manager.transferSukuk(REQUEST_ID, address(token), HOLDER, RECIPIENT, TRANSFER_AMOUNT);
    }

    function testScenario01_ApprovedManagerTransfersAndEmitsPolicyEvidence() public {
        _approveManager();
        uint256 version = registry.getPolicyVersion();
        bytes32 policyHash = registry.policyHistory(version);
        vm.expectEmit(true, true, false, true, address(manager));
        emit TransferChecked(REQUEST_ID, address(token), HOLDER, RECIPIENT, TRANSFER_AMOUNT, version, policyHash);
        _managerTransfer();
        assertEq(token.balanceOf(HOLDER), INITIAL - TRANSFER_AMOUNT);
        assertEq(token.balanceOf(RECIPIENT), TRANSFER_AMOUNT);
    }

    function testScenario02_UnapprovedAssetRevertsWithoutMovingBalances() public {
        _approveManager();
        registry.setAssetCompliance(address(token), false);
        vm.expectRevert(bytes("GPR: Asset not Shariah-compliant"));
        _managerTransfer();
        assertEq(token.balanceOf(HOLDER), INITIAL);
        assertEq(token.balanceOf(RECIPIENT), 0);
    }

    function testScenario03_UnregisteredManagerRevertsWithExactReason() public {
        DemoSukukManager unregistered = new DemoSukukManager(address(registry));
        vm.expectRevert(bytes("GPR: Calling contract not an authorized executor"));
        unregistered.transferSukuk(REQUEST_ID, address(token), HOLDER, RECIPIENT, TRANSFER_AMOUNT);
        assertEq(token.balanceOf(HOLDER), INITIAL);
        assertEq(token.balanceOf(RECIPIENT), 0);
    }

    function testScenario04_RevocationAndReapprovalAdvanceTheHashChain() public {
        _approveManager();
        uint256 approvedVersion = registry.getPolicyVersion();
        bytes32 priorHash = registry.policyHistory(approvedVersion);
        registry.setAssetCompliance(address(token), false);
        uint256 revokedVersion = approvedVersion + 1;
        bytes32 revokedHash = keccak256(
            abi.encode(priorHash, keccak256("asset"), address(token), false)
        );
        assertEq(registry.getPolicyVersion(), revokedVersion);
        assertEq(registry.policyHistory(approvedVersion), priorHash);
        assertEq(registry.policyHistory(revokedVersion), revokedHash);
        vm.expectRevert(bytes("GPR: Asset not Shariah-compliant"));
        _managerTransfer();

        registry.setAssetCompliance(address(token), true);
        uint256 reapprovedVersion = revokedVersion + 1;
        assertEq(registry.getPolicyVersion(), reapprovedVersion);
        assertTrue(registry.policyHistory(reapprovedVersion) != priorHash);
        vm.expectEmit(true, true, false, true, address(manager));
        emit TransferChecked(
            REQUEST_ID, address(token), HOLDER, RECIPIENT, TRANSFER_AMOUNT,
            reapprovedVersion, registry.policyHistory(reapprovedVersion)
        );
        _managerTransfer();
        assertEq(token.balanceOf(RECIPIENT), TRANSFER_AMOUNT);
    }

    function testScenario05_PauseStopsManagerAndDirectTransferAndNoCodeRegistryFails() public {
        _approveManager();
        registry.pause();
        vm.expectRevert(bytes4(keccak256("EnforcedPause()")));
        _managerTransfer();
        vm.prank(HOLDER);
        vm.expectRevert(bytes4(keccak256("EnforcedPause()")));
        token.transfer(RECIPIENT, TRANSFER_AMOUNT);
        assertEq(token.balanceOf(HOLDER), INITIAL);
        registry.unpause();
        _managerTransfer();
        assertEq(token.balanceOf(RECIPIENT), TRANSFER_AMOUNT);

        DemoSukukManager noRegistry = new DemoSukukManager(address(0xBEEF));
        vm.expectRevert();
        noRegistry.transferSukuk(REQUEST_ID, address(token), HOLDER, RECIPIENT, TRANSFER_AMOUNT);
    }

    function testScenario06_DirectAndDelegatedRoutesAreGatedButPlainGusdIsNot() public {
        registry.setAssetCompliance(address(token), false);
        vm.prank(HOLDER);
        vm.expectRevert(bytes("GatedDemoSukuk: asset not approved"));
        token.transfer(RECIPIENT, TRANSFER_AMOUNT);
        vm.prank(HOLDER);
        token.approve(DELEGATE, TRANSFER_AMOUNT);
        vm.prank(DELEGATE);
        vm.expectRevert(bytes("GatedDemoSukuk: asset not approved"));
        token.transferFrom(HOLDER, RECIPIENT, TRANSFER_AMOUNT);
        assertEq(token.balanceOf(HOLDER), INITIAL);
        assertEq(token.balanceOf(RECIPIENT), 0);

        registry.pause();
        vm.prank(HOLDER);
        vm.expectRevert(bytes4(keccak256("EnforcedPause()")));
        token.transfer(RECIPIENT, TRANSFER_AMOUNT);
        vm.prank(HOLDER);
        token.approve(DELEGATE, TRANSFER_AMOUNT);
        vm.prank(DELEGATE);
        vm.expectRevert(bytes4(keccak256("EnforcedPause()")));
        token.transferFrom(HOLDER, RECIPIENT, TRANSFER_AMOUNT);

        MockERC20 plainGusd = new MockERC20();
        plainGusd.transfer(HOLDER, TRANSFER_AMOUNT);
        registry.setAssetCompliance(address(plainGusd), false);
        vm.prank(HOLDER);
        assertTrue(plainGusd.transfer(RECIPIENT, TRANSFER_AMOUNT));
        assertEq(plainGusd.balanceOf(RECIPIENT), TRANSFER_AMOUNT);
    }

    function testScenario07_PostDeploymentMintAndBurnAreGated_InitialMintIsTheException() public {
        assertEq(token.balanceOf(HOLDER), INITIAL);
        assertEq(token.totalSupply(), INITIAL);
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
        assertEq(token.balanceOf(RECIPIENT), 0);
        assertEq(token.totalSupply(), INITIAL);
    }

    function testFuzz_Scenario07_RefusedTransfersNeverChangeBalances(address to, uint256 amount) public {
        vm.assume(to != address(0));
        vm.assume(to != HOLDER);
        registry.setAssetCompliance(address(token), false);
        uint256 beforeHolder = token.balanceOf(HOLDER);
        uint256 beforeRecipient = token.balanceOf(to);
        vm.prank(HOLDER);
        vm.expectRevert(bytes("GatedDemoSukuk: asset not approved"));
        token.transfer(to, amount);
        assertEq(token.balanceOf(HOLDER), beforeHolder);
        assertEq(token.balanceOf(to), beforeRecipient);
    }
}
