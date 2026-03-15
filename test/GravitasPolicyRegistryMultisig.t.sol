// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/GravitasPolicyRegistry.sol";

contract GravitasPolicyRegistryMultisigTest is Test {
    GravitasPolicyRegistry registry;
    address owner = address(0x1);
    address newOwner = address(0x2);
    address attacker = address(0x3);

    function setUp() public {
        vm.prank(owner);
        registry = new GravitasPolicyRegistry();
    }

    function test_Ownable2Step_TransferRequiresAcceptance() public {
        // Initiate transfer
        vm.prank(owner);
        registry.transferOwnership(newOwner);
        
        // Owner is still the original owner
        assertEq(registry.owner(), owner);
        assertEq(registry.pendingOwner(), newOwner);
        
        // New owner must accept
        vm.prank(newOwner);
        registry.acceptOwnership();
        
        assertEq(registry.owner(), newOwner);
    }

    function test_Ownable2Step_AttackerCannotAccept() public {
        vm.prank(owner);
        registry.transferOwnership(newOwner);
        
        vm.prank(attacker);
        vm.expectRevert();
        registry.acceptOwnership();
    }

    function test_Ownable2Step_OnlyOwnerCanPropose() public {
        vm.prank(attacker);
        vm.expectRevert();
        registry.transferOwnership(attacker);
    }
}
