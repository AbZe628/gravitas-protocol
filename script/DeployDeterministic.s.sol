// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/GravitasPolicyRegistry.sol";
import "../contracts/TeleportV3.sol";

/**
 * @title DeployDeterministic
 * @notice Foundry deployment script for Gravitas Protocol core contracts on Arbitrum Sepolia
 * @dev This script deploys the GravitasPolicyRegistry and TeleportV3 contracts with deterministic addressing.
 *      The deployment follows the institutional-grade standards outlined in the Gravitas Protocol thesis.
 * 
 * Usage:
 *   forge script script/DeployDeterministic.s.sol:DeployDeterministic \
 *     --rpc-url $RPC_URL \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $ETHERSCAN_API_KEY
 */
contract DeployDeterministic is Script {
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("==============================================");
        console.log("Gravitas Protocol - Deterministic Deployment");
        console.log("==============================================");
        console.log("Deployer Address:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("Block Number:", block.number);
        console.log("==============================================\n");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy GravitasPolicyRegistry
        console.log("Deploying GravitasPolicyRegistry...");
        GravitasPolicyRegistry registry = new GravitasPolicyRegistry();
        console.log("GravitasPolicyRegistry deployed at:", address(registry));
        console.log("  - Owner:", registry.owner());
        console.log("  - Deployer is Executor:", registry.isExecutor(deployer));

        // Step 2: Deploy TeleportV3 with required addresses
        // Note: For testnet deployment, use Arbitrum Sepolia Uniswap V3 addresses
        // PositionManager: 0x6b2937Bde17889EDCf8fbD8dE31C3C2a70Bc4d65
        // SwapRouter: 0x101F443B4d1b059569D643917553c771E1b9663E
        address positionManager = 0x6b2937Bde17889EDCf8fbD8dE31C3C2a70Bc4d65;
        address swapRouter = 0x101F443B4d1b059569D643917553c771E1b9663E;
        
        console.log("\nDeploying TeleportV3...");
        console.log("  - Position Manager:", positionManager);
        console.log("  - Swap Router:", swapRouter);
        console.log("  - Registry:", address(registry));
        
        TeleportV3 teleport = new TeleportV3(positionManager, swapRouter, address(registry));
        console.log("TeleportV3 deployed at:", address(teleport));
        console.log("  - Owner:", teleport.owner());

        vm.stopBroadcast();

        console.log("\n==============================================");
        console.log("Deployment Summary");
        console.log("==============================================");
        console.log("Network: Arbitrum Sepolia");
        console.log("GravitasPolicyRegistry:", address(registry));
        console.log("TeleportV3:", address(teleport));
        console.log("==============================================");
        console.log("\nNext Steps:");
        console.log("1. Verify contracts on Arbiscan");
        console.log("2. Check Shariah Compliance via registry.isAssetCompliant()");
        console.log("3. Configure authorized routers and compliant assets");
        console.log("4. Whitelist test tokens for migration testing");
        console.log("==============================================\n");
    }
}
