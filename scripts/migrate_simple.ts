import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const a = JSON.parse(fs.readFileSync("addresses.json","utf-8"));
  const tp = await ethers.getContractAt("Teleport", a.teleport);

  // LP saldo Teleporta na pairA
  const pair = await ethers.getContractAt(
    "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair",
    a.pairA
  );
  let lp = await pair.balanceOf(a.teleport);
  if (lp > 1000000000n) lp = lp - 1000000000n; // uzmi mrvicu manje radi rubnih rounding-a

  const deadline = Math.floor(Date.now()/1000) + 24*3600;

  console.log("Calling migrateLiquidityV2Simple...");
  const tx = await (tp as any).migrateLiquidityV2Simple(
    a.routerA,
    a.routerB,
    a.tka,
    a.tkb,
    lp,
    0, // addAMin (demo)
    0, // addBMin (demo)
    deadline
  );
  const r = await tx.wait();
  console.log("Migrated (simple). TX:", r?.hash);
}

main().catch(e => { console.error(e); process.exit(1); });
