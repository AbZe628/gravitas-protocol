import { ethers } from "hardhat";

// --- Postavi svoje podatke ovdje ---
// Adresa ugovora koji smo deployali
const DEPLOYED_ADDRESS = "0xb2ffB8704a2bb15c4AFc37789d9C0b598Cb79f64";
// Ime ugovora (mora biti isto kao .sol datoteka, npr. "Teleport")
const CONTRACT_NAME = "Teleport";
// ------------------------------------

async function main() {
  // 1. Dohvati naš deployer račun (naš "Testnet" račun, index 2)
  const [deployer] = await ethers.getSigners();
  console.log(`Interakcija s ugovorom na adresi: ${DEPLOYED_ADDRESS}`);
  console.log(`Koristim račun: ${deployer.address}`);

  // 2. Spoji se na postojeći, deployani ugovor
  const contract = await ethers.getContractAt(CONTRACT_NAME, DEPLOYED_ADDRESS, deployer);
  console.log("Uspješno spojen na 'Teleport' ugovor.");

  // 3. KORAK 3 - Pobjednički Potez!
  // Pozivamo 'transferOwnership' funkciju i prebacujemo vlasništvo...
  // ...sami na sebe! Ovo je najsigurniji "ping" test.
  // Ovim dokazujemo da smo mi 'owner' i da funkcije rade.
  console.log("Šaljem 'write' transakciju (pozivam transferOwnership)...");
  
  const tx = await contract.transferOwnership(deployer.address);
  
  // 4. Pričekaj da se transakcija potvrdi na Arbitrumu
  console.log(`Transakcija poslana (Hash: ${tx.hash}). Čekam potvrdu...`);
  await tx.wait(); // Čeka da se transakcija izrudari

  // 5. Pobjeda! Ispiši TX hash.
  console.log("✅ Pobjeda! 'Write' transakcija je potvrđena!");
  console.log("---");
  console.log("Ovo je KONAČNI DOKAZ za recenzente (Transaction Hash):");
  console.log(tx.hash);
  console.log("---");
  console.log("Možeš je vidjeti na Arbiscanu:");
  console.log(`https://sepolia.arbiscan.io/tx/${tx.hash}`);
  console.log("---");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});