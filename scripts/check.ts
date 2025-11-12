import { ethers } from "hardhat";

// --- OVDJE ZALIJEPI ADRESU KOJU SI DOBIO ---
const DEPLOYED_ADDRESS = "0xb2ffB8704a2bb15c4AFc37789d9C0b598Cb79f64";
// ------------------------------------------

async function main() {
  console.log(`Provjeravam kod na adresi: ${DEPLOYED_ADDRESS}`);
  
  // Dohvati providera (našu vezu s Arbitrum Sepolia)
  const provider = ethers.provider;

  // 1. Pročitaj kod s lanca (on-chain)
  const code = await provider.getCode(DEPLOYED_ADDRESS);

  // 2. Provjeri
  if (code === "0x") {
    console.error("❌ GREŠKA: Nema koda na ovoj adresi!");
    console.log("Jesi li siguran da si dobro kopirao adresu?");
  } else {
    console.log("✅ Provjera uspješna! Ugovor je pronađen na Arbitrum Sepolia.");
    console.log(`Duljina koda: ${code.length} znakova.`);
    console.log("---");
    console.log("Ovo dokazuje da je deploy uspio i da je RPC veza 'read' uspješna.");
    console.log("---");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});