import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Pokrećem deploy s računom:", deployer.address);
  
  // Provjerimo imamo li goriva (onaj 0.05 ETH)
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Stanje računa (Balans):", ethers.formatEther(balance), "ETH");

  // 1. Pronađi tvoj ugovor (zove se 'Teleport' u tvom starom kodu)
  // Pazi: Ime "Teleport" mora biti TOČNO kao ime ugovora u contracts/ folderu.
  // Ako se tvoj ugovor zove npr. GravitasProtocol.sol, onda ovdje stavi "GravitasProtocol"
  const GravitasProtocol = await ethers.getContractFactory("Teleport");

  // 2. Deployaj SAMO taj ugovor
  console.log("Deployam 'Teleport' (Gravitas Protocol)... Molim pričekaj...");
  const gravitas = await GravitasProtocol.deploy();

  // 3. Pričekaj da se deploy završi
  await gravitas.waitForDeployment();

  // 4. Ispiši adresu
  const contractAddress = await gravitas.getAddress();
  console.log("✅ Uspjeh! Tvoj ugovor je deployan na Arbitrum Sepolia.");
  console.log("Adresa ugovora:", contractAddress);

  // 5. Ispiši link za Arbiscan (ovo ti je DOKAZ za grant!)
  console.log("---");
  console.log("Možeš ga provjeriti na Arbiscanu:");
  console.log(`https://sepolia.arbiscan.io/address/${contractAddress}`);
  console.log("---");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});