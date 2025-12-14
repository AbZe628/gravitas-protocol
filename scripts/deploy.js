const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Pokrećem deploy s računom:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Stanje računa:", ethers.formatEther(balance), "ETH");

  const TeleportFactory = await ethers.getContractFactory("Teleport");

  console.log("⏳ Deployam 'Teleport' (Reviewer-Proof MVP)...");
  const teleport = await TeleportFactory.deploy();

  await teleport.waitForDeployment();
  const contractAddress = await teleport.getAddress();

  console.log("✅ USPJEH! Ugovor je deployan.");
  console.log("📍 Adresa ugovora:", contractAddress);
  console.log("🔗 Arbiscan Link:", `https://sepolia.arbiscan.io/address/${contractAddress}`);

  console.log("----------------------------------------------------");
  console.log("⏳ Čekam 30 sekundi da Arbiscan indeksira ugovor...");
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  console.log("✅ Spreman za verifikaciju! Kopiraj i pokreni naredbu ispod:");
  console.log(`npx hardhat verify --network arbitrumSepolia ${contractAddress}`);
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error("❌ Došlo je do greške:", error);
  process.exitCode = 1;
});