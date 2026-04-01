// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/GravitasPolicyRegistry.sol";

contract GravitasLibearaIntegrationTest is Test {
    GravitasPolicyRegistry registry;
    address owner = address(0x1);
    address asset = address(0x100);
    address subscriber = address(0x200);
    address executor = address(0x300);
    address unauthorized = address(0x400);

    function setUp() public {
        vm.prank(owner);
        registry = new GravitasPolicyRegistry();

        // Setup initial compliance
        vm.startPrank(owner);
        registry.setAssetCompliance(asset, true);
        registry.setExecutorStatus(executor, true);
        vm.stopPrank();
    }

    function test_CheckSubscriptionCompliance_Success() public {
        // NOTE: This tests that the *calling contract* (executor = UltraManager) is authorized.
        // The `subscriber` parameter is reserved for future per-investor policy logic (v2).
        vm.prank(executor);
        uint256 policyVersion = registry.checkSubscriptionCompliance(subscriber, asset);
        assertEq(policyVersion, registry.currentVersion());
    }

    function test_CheckSubscriptionCompliance_RevertOnNonCompliantAsset() public {
        address nonCompliantAsset = address(0x999);
        vm.prank(executor);
        vm.expectRevert("GPR: Asset not Shariah-compliant");
        registry.checkSubscriptionCompliance(subscriber, nonCompliantAsset);
    }

    function test_CheckSubscriptionCompliance_RevertOnUnauthorizedExecutor() public {
        vm.prank(unauthorized);
        vm.expectRevert("GPR: Calling contract not an authorized executor");
        registry.checkSubscriptionCompliance(subscriber, asset);
    }

    function test_VerifyAssetCompliance() public {
        assertTrue(registry.verifyAssetCompliance(asset));
        assertFalse(registry.verifyAssetCompliance(address(0xdead)));
    }

    function test_AreTokensCompliant() public {
        address asset2 = address(0x101);
        vm.prank(owner);
        registry.setAssetCompliance(asset2, true);

        assertTrue(registry.areTokensCompliant(asset, asset2));
        assertFalse(registry.areTokensCompliant(asset, address(0xdead)));
    }

    function test_VerifyExecutorStatus() public {
        assertTrue(registry.verifyExecutorStatus(executor));
        assertFalse(registry.verifyExecutorStatus(unauthorized));
    }
}
