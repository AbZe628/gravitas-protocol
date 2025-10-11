import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const [user] = await ethers.getSigners();
  const data = JSON.parse(fs.readFileSync("addresses.json", "utf-8"));

  console.log("Using deploys:", data);
  // Ovdje je već dodana likvidnost u deploy.ts i LP je u Teleportu.
  // Seed sada može samo potvrditi stanje (opcionalno) ili ništa ne raditi.
  // Ostavimo kao no-op da ne uvodimo rizik.
  console.log("Seed: nothing to do (LP already minted to Teleport).");
}

main().catch((e) => { console.error(e); process.exit(1); });
