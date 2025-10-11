import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const a = JSON.parse(fs.readFileSync("addresses.json","utf-8"));

  // sanity log
  console.log("Using:", a);

  const tp = await ethers.getContractAt("Teleport", a.teleport);

  // LP saldo Teleporta na pairA
  const pairA = await ethers.getContractAt(
    "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair",
    a.pairA
  );
  let lp = await pairA.balanceOf(a.teleport);
  if (lp > 1000000000n) lp = lp - 1000000000n; // skini mrvice radi rubnih rounding-a

  console.log("Manual migrate A->B, LP:", lp.toString());
  const tx = await (tp as any).migrateLiquidityV2Manual(
    a.factoryA,
    a.factoryB,
    a.tka,
    a.tkb,
    lp
  );
  const rcpt = await tx.wait();
  console.log("Migrated (manual). TX:", rcpt?.hash);
}

main().catch(e => { console.error(e); process.exit(1); });
