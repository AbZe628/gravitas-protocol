import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const a = JSON.parse(fs.readFileSync("addresses.json","utf8"));
  const [deployer] = await ethers.getSigners();

  const erc20 = async (addr: string) =>
    await ethers.getContractAt("@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20", addr);

  const tka = await erc20(a.tka);
  const tkb = await erc20(a.tkb);

  const amount = ethers.parseEther("1000"); // dovoljno za addLiquidity

  console.log("Funding Teleport with TokenA & TokenB from deployer…");
  console.log("From:", deployer.address, "To Teleport:", a.teleport);

  let tx = await tka.transfer(a.teleport, amount);
  await tx.wait();
  console.log("TokenA -> Teleport OK");

  tx = await tkb.transfer(a.teleport, amount);
  await tx.wait();
  console.log("TokenB -> Teleport OK");

  console.log("Done funding.");
}

main().catch(e => { console.error(e); process.exit(1); });
