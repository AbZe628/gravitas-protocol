// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/GravitasPolicyRegistry.sol";
import "../contracts/TeleportV2.sol";
import "../contracts/TeleportV3.sol";
import "../contracts/governance/GravitasTimelock.sol";

/**
 * @title Deploy
 * @notice Deploys the full protocol: the registry, both routing engines, and the
 *         timelock that will eventually govern them.
 *
 * @dev Ownership is deliberately NOT handed to the timelock here. The registry
 *      uses Ownable2Step, so a handover is propose-then-accept, and the accept
 *      has to come from the timelock through a scheduled call. Doing that in the
 *      same transaction as the deployment hides a step that deserves to be
 *      watched. Run script/TransferOwnershipToTimelock.s.sol afterwards.
 *
 *      Policy is left empty on purpose. Which assets are compliant is a board's
 *      decision and does not belong in a deployment script.
 *
 * Usage:
 *   forge script script/Deploy.s.sol \
 *     --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
 *     --broadcast --interactive
 *
 *   --interactive is a flag and takes no value; --interactives <NUM> is the one
 *   that does. It prompts for the key without echoing it, so it never reaches
 *   the shell history or the process environment. Setting DEPLOYER_KEY works
 *   too, and is what CI would use.
 */
contract Deploy is Script {
    // Uniswap V3 on Arbitrum Sepolia. Override through the environment for any
    // other network.
    //
    // The previous TeleportV3 was deployed against 0xE592...1564, the original
    // SwapRouter. That address holds no code on Arbitrum Sepolia, so the
    // rebalancing swap could never have executed. SwapRouter02 is what this
    // network actually carries, and the interface in TeleportV3 now matches it.
    address constant DEFAULT_POSITION_MANAGER = 0x6b2937Bde17889EDCf8fbD8dE31C3C2a70Bc4d65;
    address constant DEFAULT_SWAP_ROUTER = 0x101F443B4d1b059569D643917553c771E1b9663E;

    // 48 hours is the production figure. Testnet uses something a person can sit
    // through, and TIMELOCK_DELAY overrides it.
    uint256 constant DEFAULT_TIMELOCK_DELAY = 300;

    function run()
        external
        returns (GravitasPolicyRegistry registry, TeleportV3 teleportV3, TeleportV2 teleportV2, GravitasTimelock timelock)
    {
        // Two ways in. DEPLOYER_KEY is convenient but leaves the key in the
        // shell history and the process environment. Leaving it unset lets
        // forge supply the signer instead, from --interactive or --account,
        // and the key never becomes a string anywhere.
        uint256 deployerKey = vm.envOr("DEPLOYER_KEY", uint256(0));
        address deployer = deployerKey != 0 ? vm.addr(deployerKey) : msg.sender;

        address positionManager = vm.envOr("POSITION_MANAGER", DEFAULT_POSITION_MANAGER);
        address swapRouter = vm.envOr("SWAP_ROUTER", DEFAULT_SWAP_ROUTER);
        uint256 timelockDelay = vm.envOr("TIMELOCK_DELAY", DEFAULT_TIMELOCK_DELAY);

        // A router with no code is the failure that produced a dead swap path
        // last time. Refuse rather than repeat it.
        require(positionManager.code.length > 0, "Deploy: position manager has no code on this network");
        require(swapRouter.code.length > 0, "Deploy: swap router has no code on this network");

        console.log("deployer          ", deployer);
        console.log("chain id          ", block.chainid);
        console.log("position manager  ", positionManager);
        console.log("swap router       ", swapRouter);
        console.log("");

        if (deployerKey != 0) {
            vm.startBroadcast(deployerKey);
        } else {
            vm.startBroadcast();
        }

        registry = new GravitasPolicyRegistry();
        console.log("GravitasPolicyRegistry", address(registry));

        teleportV3 = new TeleportV3(positionManager, swapRouter, address(registry));
        console.log("TeleportV3            ", address(teleportV3));

        teleportV2 = new TeleportV2(address(registry));
        console.log("TeleportV2            ", address(teleportV2));

        address[] memory proposers = new address[](1);
        proposers[0] = deployer;
        address[] memory executors = new address[](1);
        executors[0] = address(0); // anyone may execute once the delay has passed
        timelock = new GravitasTimelock(timelockDelay, proposers, executors, address(0));
        console.log("GravitasTimelock      ", address(timelock));

        vm.stopBroadcast();

        console.log("");
        console.log("policy version at genesis", registry.currentVersion());
        console.log("registry paused          ", registry.paused());
        console.log("");
        console.log("Ownership still sits with the deployer. Hand it to the timelock");
        console.log("with script/TransferOwnershipToTimelock.s.sol when ready.");
    }
}
