import { ethers } from "hardhat";
import * as fs from "fs";
import { Contract } from "ethers";

const V2_ROUTER = "0x9ac64cc6e4415144c455bd8e4837fea55603e5c3"; // PancakeSwap V2 - BSC Testnet

async function main() {
  const [signer] = await ethers.getSigners();
  const deployed = JSON.parse(fs.readFileSync("deployed.json", "utf8"));
  const tka = await ethers.getContractAt("TokenA", deployed.tka);
  const tkb = await ethers.getContractAt("TokenB", deployed.tkb);

  // Approve router to spend tokens
  const amountA = ethers.parseUnits("1000", 18);
  const amountB = ethers.parseUnits("1000", 18);

  await (await tka.connect(signer).approve(V2_ROUTER, amountA)).wait();
  await (await tkb.connect(signer).approve(V2_ROUTER, amountB)).wait();

  // Add liquidity (creates pair + mints LP to signer)
  const router = await ethers.getContractAt("IUniswapV2Router02", V2_ROUTER);
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  const tx = await router.connect(signer).addLiquidity(
    deployed.tka, deployed.tkb,
    amountA, amountB,
    0, 0,
    await signer.getAddress(),
    deadline
  );
  const rc = await tx.wait();
  console.log("Liquidity added. TX:", rc?.hash);

  // Get Pair address from factory, approve Teleport to move LP
  const factoryAddr = await router.factory();
  const factory = await ethers.getContractAt("IUniswapV2Factory", factoryAddr);
  const pairAddr = await factory.getPair(deployed.tka, deployed.tkb);
  console.log("Pair:", pairAddr);

  const pair = await ethers.getContractAt("IUniswapV2Pair", pairAddr);
  const lpBal = await pair.balanceOf(await signer.getAddress());
  console.log("LP balance:", lpBal.toString());

  // Approve Teleport to pull LP
  await (await pair.connect(signer).approve(deployed.teleport, lpBal)).wait();

  fs.writeFileSync("pair.json", JSON.stringify({ router: V2_ROUTER, pair: pairAddr, lp: lpBal.toString() }, null, 2));
  console.log("Seed complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
