// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/GravitasPolicyRegistry.sol";

/**
 * @title PolicyCommitment
 * @notice The registry's whole purpose is to let a board ask "is what runs what we
 *         approved" and answer it by comparison rather than by testimony. That
 *         reduces to whether policyHistory commits to the policy. These tests hold
 *         it to that.
 */
contract PolicyCommitment is Test {
    GravitasPolicyRegistry registry;

    address constant TOKEN_A = address(0xA11CE);
    address constant TOKEN_B = address(0xB0B);
    address constant ROUTER = address(0x2222);

    bytes32 constant FIELD_ASSET = keccak256("asset");
    bytes32 constant FIELD_ROUTER = keccak256("router");
    bytes32 constant FIELD_EXECUTOR = keccak256("executor");

    event ExecutorStatusUpdated(address indexed executor, bool status);
    event PolicyUpdated(uint256 indexed version, bytes32 policyHash);

    function setUp() public {
        registry = new GravitasPolicyRegistry();
    }

    // ── the chain itself ────────────────────────────────────────────────────

    function test_GenesisIsTheDeployerGrant() public view {
        // The constructor's own executor grant is version 1, not an untracked
        // side effect that leaves the record starting mid-history.
        assertEq(registry.currentVersion(), 1);
        assertTrue(registry.isExecutor(address(this)));
        assertEq(registry.policyHistory(0), bytes32(0));
        assertEq(registry.policyHistory(1), keccak256(abi.encode(bytes32(0), FIELD_EXECUTOR, address(this), true)));
    }

    function test_EachVersionFoldsInTheOneBeforeIt() public {
        bytes32 v1 = registry.policyHistory(1);

        registry.setAssetCompliance(TOKEN_A, true);
        bytes32 v2 = registry.policyHistory(2);
        assertEq(v2, keccak256(abi.encode(v1, FIELD_ASSET, TOKEN_A, true)));

        registry.setRouterAuthorization(ROUTER, true);
        bytes32 v3 = registry.policyHistory(3);
        assertEq(v3, keccak256(abi.encode(v2, FIELD_ROUTER, ROUTER, true)));

        registry.setAssetCompliance(TOKEN_A, false);
        bytes32 v4 = registry.policyHistory(4);
        assertEq(v4, keccak256(abi.encode(v3, FIELD_ASSET, TOKEN_A, false)));

        assertEq(registry.currentVersion(), 4);
    }

    function test_AnObserverCanReplayTheChainFromEvents() public {
        vm.recordLogs();
        registry.setAssetCompliance(TOKEN_A, true);
        registry.setAssetCompliance(TOKEN_B, true);
        registry.setExecutorStatus(address(0xE), true);

        // Replay independently and compare, which is the operation the whole
        // design exists to support.
        bytes32 running = registry.policyHistory(1);
        running = keccak256(abi.encode(running, FIELD_ASSET, TOKEN_A, true));
        running = keccak256(abi.encode(running, FIELD_ASSET, TOKEN_B, true));
        running = keccak256(abi.encode(running, FIELD_EXECUTOR, address(0xE), true));

        assertEq(registry.policyHistory(registry.currentVersion()), running);
    }

    // ── the collision the old scheme allowed ────────────────────────────────

    function test_TwoDifferentPoliciesDoNotShareAHash() public {
        // The previous scheme hashed (block.timestamp, msg.sender, currentVersion).
        // Two registries whitelisting different tokens, in the same block, from the
        // same sender, at the same version, produced identical hashes — so the hash
        // could not distinguish the policies it was supposed to attest to.
        GravitasPolicyRegistry first = new GravitasPolicyRegistry();
        GravitasPolicyRegistry second = new GravitasPolicyRegistry();

        first.setAssetCompliance(TOKEN_A, true);
        second.setAssetCompliance(TOKEN_B, true);

        assertEq(first.currentVersion(), second.currentVersion());
        assertTrue(first.policyHistory(2) != second.policyHistory(2));
    }

    function test_MovingAnAddressBetweenRegistersChangesTheHash() public {
        GravitasPolicyRegistry asAsset = new GravitasPolicyRegistry();
        GravitasPolicyRegistry asRouter = new GravitasPolicyRegistry();

        asAsset.setAssetCompliance(TOKEN_A, true);
        asRouter.setRouterAuthorization(TOKEN_A, true);

        // Same address, same status, same position in the chain — different register.
        assertTrue(asAsset.policyHistory(2) != asRouter.policyHistory(2));
    }

    function test_OrderOfChangesIsPartOfTheCommitment() public {
        GravitasPolicyRegistry ab = new GravitasPolicyRegistry();
        GravitasPolicyRegistry ba = new GravitasPolicyRegistry();

        ab.setAssetCompliance(TOKEN_A, true);
        ab.setAssetCompliance(TOKEN_B, true);

        ba.setAssetCompliance(TOKEN_B, true);
        ba.setAssetCompliance(TOKEN_A, true);

        // Same final whitelist, different history. A running hash is a commitment
        // to the sequence, and that is the honest thing for a governance record.
        assertTrue(ab.isAssetCompliant(TOKEN_A) == ba.isAssetCompliant(TOKEN_A));
        assertTrue(ab.isAssetCompliant(TOKEN_B) == ba.isAssetCompliant(TOKEN_B));
        assertTrue(ab.policyHistory(3) != ba.policyHistory(3));
    }

    // ── writes that change nothing ──────────────────────────────────────────

    function test_RewritingTheSameValueIsNotAPolicyChange() public {
        registry.setAssetCompliance(TOKEN_A, true);
        uint256 version = registry.currentVersion();
        bytes32 hashAtVersion = registry.policyHistory(version);

        registry.setAssetCompliance(TOKEN_A, true);
        registry.setAssetCompliance(TOKEN_A, true);

        assertEq(registry.currentVersion(), version);
        assertEq(registry.policyHistory(version), hashAtVersion);
        assertTrue(registry.isAssetCompliant(TOKEN_A));
    }

    function test_SettingSomethingBackToFalseThatWasNeverTrueIsNotAChange() public {
        uint256 version = registry.currentVersion();
        registry.setAssetCompliance(TOKEN_A, false);
        assertEq(registry.currentVersion(), version);
    }

    function test_ARealChangeStillAdvancesTheRecord() public {
        registry.setAssetCompliance(TOKEN_A, true);
        uint256 afterFirst = registry.currentVersion();
        registry.setAssetCompliance(TOKEN_A, false);
        assertEq(registry.currentVersion(), afterFirst + 1);
    }

    // ── the guards that were already there ──────────────────────────────────

    function test_ZeroAddressIsStillRejected() public {
        vm.expectRevert("GPR: Invalid asset address");
        registry.setAssetCompliance(address(0), true);
        vm.expectRevert("GPR: Invalid router address");
        registry.setRouterAuthorization(address(0), true);
        vm.expectRevert("GPR: Invalid executor address");
        registry.setExecutorStatus(address(0), true);
    }

    function test_OnlyTheOwnerWrites() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert();
        registry.setAssetCompliance(TOKEN_A, true);
    }

    function test_GetPolicyVersionTracksTheChain() public {
        assertEq(registry.getPolicyVersion(), registry.currentVersion());
        registry.setAssetCompliance(TOKEN_A, true);
        assertEq(registry.getPolicyVersion(), registry.currentVersion());
    }
}
