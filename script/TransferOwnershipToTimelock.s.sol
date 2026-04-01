// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/GravitasPolicyRegistry.sol";
import "../contracts/governance/GravitasTimelock.sol";

contract TransferOwnershipToTimelock is Script {
    function run() external returns (GravitasPolicyRegistry registry, GravitasTimelock timelock) {
        uint256 deployerKey = vm.envUint("DEPLOYER_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // 1. Deploy GravitasTimelock
        // Using a short delay for testnet (e.g., 5 minutes = 300 seconds)
        uint256 minDelay = 300;
        address[] memory proposers = new address[](1);
        proposers[0] = deployer;
        address[] memory executors = new address[](1);
        executors[0] = deployer;
        address admin = address(0); // No admin, fully decentralized

        timelock = new GravitasTimelock(minDelay, proposers, executors, admin);
        console.log("GravitasTimelock deployed at:", address(timelock));

        // 2. Get deployed GravitasPolicyRegistry address
        // Using the address from DEPLOYMENTS.md
        registry = GravitasPolicyRegistry(0xbcaE3069362B0f0b80f44139052f159456C84679);
        console.log("GravitasPolicyRegistry address:", address(registry));

        // 3. Transfer ownership of GravitasPolicyRegistry to GravitasTimelock
        registry.transferOwnership(address(timelock));
        console.log("Ownership transfer initiated for GravitasPolicyRegistry to Timelock.");

        // Note: For a complete setup, the Timelock would need to schedule and execute
        // the acceptOwnership call on the GravitasPolicyRegistry.

        vm.stopBroadcast();
    }
}
