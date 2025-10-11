import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [user] = await ethers.getSigners();
  const deployed = JSON.parse(fs.readFileSync("deployed.json", "utf8"));
  const seed = JSON.parse(fs.readFileSync("pair.json", "utf8"));

  const teleport = await ethers.getContractAt("Teleport", deployed.teleport);
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  // koristimo isti router za demo (from == to)
  const routerFrom = seed.router;
  const routerTo = seed.router;

  // remove min i add min postavljamo 0 za test (bez slippage zaštite u MVP-u)
  const removeMin = 0;
  const addMin = 0;

  // LP količina iz seed-a
  const lpStr = seed.lp;

  const tx = await teleport.connect(user).migrateLiquidityV2(
    routerFrom,
    routerTo,
    deployed.tka,
    deployed.tkb,
    lpStr,        // cijeli LP balans
    removeMin,
    removeMin,
    addMin,
    addMin,
    deadline
  );
  const rc = await tx.wait();
  console.log("Migrated! TX:", rc?.hash);
}

main().catch((e) => { console.error(e); process.exit(1); });
