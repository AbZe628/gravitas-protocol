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
}
