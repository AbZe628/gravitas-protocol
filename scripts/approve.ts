import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const a = JSON.parse(fs.readFileSync("addresses.json","utf8"));
  const tp = await ethers.getContractAt("Teleport", a.teleport);
  const MAX = ethers.MaxUint256;

  console.log("Approving LP allowance pair->routerA from Teleport...");
  const tx = await (tp as any).approveLP(a.pairA, a.routerA, MAX);
  const rcpt = await tx.wait();
  console.log("approveLP tx:", rcpt?.hash);
}

main().catch(e => { console.error(e); process.exit(1); });
