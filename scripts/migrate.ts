import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const [caller] = await ethers.getSigners();
  const data = JSON.parse(fs.readFileSync("addresses.json", "utf-8"));

  const pair = await ethers.getContractAt(
    "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair",
    data.pairA
  );

  // 1) LP JE U TVOM EOA — očitaj ga
  const lpBalance = await pair.balanceOf(caller.address);
  if (lpBalance === 0n) throw new Error("EOA has 0 LP — redeploy or check pair.");

  // 2) Odobri Teleportu da povuče LP
  await (await pair.approve(data.teleport, lpBalance)).wait();

  // 3) Pozovi migraciju
  const tp = await ethers.getContractAt("Teleport", data.teleport);

  const routerFrom = data.routerA;
  const routerTo   = data.routerB;
  const tokenA     = data.tka;
  const tokenB     = data.tkb;

  const removeAMin = 0;
  const removeBMin = 0;
  const addAMin    = 0;
  const addBMin    = 0;
  const deadline   = Math.floor(Date.now() / 1000) + 3600;

  console.log("Teleport LP (EOA) balance:", lpBalance.toString());
  const tx = await (tp as any).migrateLiquidityV2(
    routerFrom,
    routerTo,
    tokenA,
    tokenB,
    lpBalance,
    removeAMin,
    removeBMin,
    addAMin,
    addBMin,
    deadline
  );
  const rcpt = await tx.wait();
  console.log("Migrated. TX:", rcpt?.hash);
}

main().catch((e) => { console.error(e); process.exit(1); });
