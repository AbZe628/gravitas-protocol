import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const a = JSON.parse(fs.readFileSync("addresses.json","utf8"));
  const tp = await ethers.getContractAt("Teleport", a.teleport);
  const MAX = ethers.MaxUint256;

  console.log("Approving tokenA/tokenB allowances from Teleport to routerB…");
  const tx = await (tp as any).approveTokens(a.tka, a.tkb, a.routerB, MAX);
  const rcpt = await tx.wait();
  console.log("approveTokens tx:", rcpt?.hash);
}

main().catch(e => { console.error(e); process.exit(1); });
