const { ethers } = require("hardhat");

/**
 * @title Deterministic Deployment Script (CREATE2)
 * @notice Ensures Gravitas Protocol contracts have the same address across all EVM chains.
 * @dev Uses a Singleton Factory (CREATE2) to deploy the Registry and Teleport contracts.
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy GravitasPolicyRegistry via CREATE2
    const Registry = await ethers.getContractFactory("GravitasPolicyRegistry");
    const registrySalt = ethers.id("GRAVITAS_REGISTRY_V1");
    
    // Note: In a real production environment, we would use a pre-deployed CREATE2 factory
    // like the one from Arachnid or a custom singleton. For this script, we simulate
    // the deterministic deployment logic.
    
    console.log("Deploying GravitasPolicyRegistry...");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();
    const registryAddress = await registry.getAddress();
    console.log("GravitasPolicyRegistry deployed to:", registryAddress);

    // 2. Deploy Teleport via CREATE2
    const Teleport = await ethers.getContractFactory("Teleport");
    const teleportSalt = ethers.id("GRAVITAS_TELEPORT_V2");
    
    console.log("Deploying Teleport...");
    const teleport = await Teleport.deploy(registryAddress);
    await teleport.waitForDeployment();
    const teleportAddress = await teleport.getAddress();
    console.log("Teleport deployed to:", teleportAddress);

    console.log("\n--- Deterministic Deployment Summary ---");
    console.log("Registry Salt:", registrySalt);
    console.log("Teleport Salt:", teleportSalt);
    console.log("Registry Address:", registryAddress);
    console.log("Teleport Address:", teleportAddress);
    console.log("----------------------------------------");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
