// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/GravitasPolicyRegistry.sol";
import "../../contracts/TeleportV3.sol";
import "../../contracts/interfaces/IShariahPolicyChecker.sol";

contract PausableTests is Test {
    GravitasPolicyRegistry registry;
    TeleportV3 teleport;
    address owner = address(0x1);
    address user = address(0x2);

    // Mock addresses for TeleportV3 constructor
    address positionManager = address(0x3);
    address swapRouter = address(0x4);

    function setUp() public {
        vm.startPrank(owner);
        registry = new GravitasPolicyRegistry();
        teleport = new TeleportV3(positionManager, swapRouter, address(registry));
        vm.stopPrank();
    }

    function test_Registry_PauseUnpause() public {
        vm.startPrank(owner);
        assertFalse(registry.paused());

        registry.pause();
        assertTrue(registry.paused());

        registry.unpause();
        assertFalse(registry.paused());
        vm.stopPrank();
    }

    function test_Registry_OnlyOwnerCanPause() public {
        vm.startPrank(user);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user));
        registry.pause();
        vm.stopPrank();
    }

    function test_Teleport_PauseUnpause() public {
        vm.startPrank(owner);
        assertFalse(teleport.paused());

        teleport.pause();
        assertTrue(teleport.paused());

        teleport.unpause();
        assertFalse(teleport.paused());
        vm.stopPrank();
    }

    function test_Teleport_OnlyOwnerCanPause() public {
        vm.startPrank(user);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user));
        teleport.pause();
        vm.stopPrank();
    }

    function test_Teleport_MigrationRevertsWhenPaused() public {
        // Authorize the user as an executor
        vm.startPrank(owner);
        registry.setExecutorStatus(user, true);
        teleport.pause();
        vm.stopPrank();

        vm.startPrank(user);
        TeleportV3.AtomicMigrationParams memory params;
        bytes memory signature = "";

        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        teleport.executeAtomicMigration(params, signature);
        vm.stopPrank();
    }

    // ──────────────────────────────────────────────────────────────────────────────
    //  Registry pause now gates the COMPLIANCE VERIFICATION API (previously a no-op).
    //  These tests prove the fix for the finding: "Pausable decorator is non-functional
    //  because whenNotPaused gates only pause/unpause rather than verify functions."
    // ──────────────────────────────────────────────────────────────────────────────

    function test_Registry_VerifyFunctionsRevertWhenPaused() public {
        vm.startPrank(owner);
        registry.setAssetCompliance(address(0xA11CE), true);
        registry.setRouterAuthorization(address(0xB0B), true);
        registry.setExecutorStatus(address(0xE0E), true);
        registry.pause();
        vm.stopPrank();

        // Every enforcement entry point must fail closed with EnforcedPause().
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        registry.verifyAssetCompliance(address(0xA11CE));

        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        registry.areTokensCompliant(address(0xA11CE), address(0xA11CE));

        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        registry.verifyRouterAuthorization(address(0xB0B));

        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        registry.verifyExecutorStatus(address(0xE0E));

        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        registry.checkSubscriptionCompliance(address(0x1234), address(0xA11CE));
    }

    function test_Registry_PauseHaltsExecutorAuthorizationSystemWide() public {
        // The registry pause must propagate to integrators: TeleportV3's onlyAuthorized
        // gate calls registry.verifyExecutorStatus, which now reverts under pause.
        vm.startPrank(owner);
        registry.setExecutorStatus(user, true);
        registry.pause(); // pause the REGISTRY, not TeleportV3
        vm.stopPrank();

        vm.startPrank(user);
        TeleportV3.AtomicMigrationParams memory params;
        params.newFee = 500;
        params.newTickLower = -10;
        params.newTickUpper = 10;
        params.amount0MinMint = 1;
        params.amount1MinMint = 1;
        params.deadline = block.timestamp + 1 hours;

        // Non-owner executor is fail-closed at the authorization gate.
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        teleport.executeAtomicMigration(params, "");
        vm.stopPrank();
    }

    function test_Registry_UnpauseRestoresVerification() public {
        vm.startPrank(owner);
        registry.setExecutorStatus(address(0xE0E), true);
        registry.pause();
        registry.unpause();
        vm.stopPrank();

        // After unpause the verify API behaves normally again.
        assertTrue(registry.verifyExecutorStatus(address(0xE0E)));
        assertFalse(registry.verifyExecutorStatus(address(0xDEAD)));
    }

    function test_Registry_OwnerNotLockedOutOfAuthGateByRegistryPause() public {
        // Owner short-circuits onlyAuthorized before the (paused) registry is queried,
        // so a registry pause cannot brick the protocol owner at the authorization gate.
        // We de-authorize the owner as an executor and pause the registry: if the owner
        // were NOT short-circuited, verifyExecutorStatus would revert EnforcedPause here.
        // Instead, the owner passes the gate and the call proceeds to parameter checks,
        // reverting on the empty struct's expired deadline — proving the gate was passed.
        vm.startPrank(owner);
        GravitasPolicyRegistry freshRegistry = new GravitasPolicyRegistry();
        TeleportV3 freshTeleport = new TeleportV3(positionManager, swapRouter, address(freshRegistry));
        freshRegistry.setExecutorStatus(owner, false); // owner is NOT an executor
        freshRegistry.pause();

        TeleportV3.AtomicMigrationParams memory params; // deadline = 0 → expired
        vm.expectRevert("TV3: Deadline expired");
        freshTeleport.executeAtomicMigration(params, "");
        vm.stopPrank();
    }
}
