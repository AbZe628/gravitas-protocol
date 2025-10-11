import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const TokenA = await ethers.getContractFactory("TokenA");
  const TokenB = await ethers.getContractFactory("TokenB");
  const UniV2Adapter = await ethers.getContractFactory("UniV2Adapter");
  const Teleport = await ethers.getContractFactory("Teleport");

  const tka = await TokenA.deploy();
  await tka.waitForDeployment();
  const tkaAddr = await tka.getAddress();

  const tkb = await TokenB.deploy();
  await tkb.waitForDeployment();
  const tkbAddr = await tkb.getAddress();

  const adapter = await UniV2Adapter.deploy();
  await adapter.waitForDeployment();
  const adapterAddr = await adapter.getAddress();

  const teleport = await Teleport.deploy(adapterAddr);
  await teleport.waitForDeployment();
  const teleportAddr = await teleport.getAddress();

  console.log({ tka: tkaAddr, tkb: tkbAddr, adapter: adapterAddr, teleport: teleportAddr });
  fs.writeFileSync("deployed.json", JSON.stringify({ tka: tkaAddr, tkb: tkbAddr, adapter: adapterAddr, teleport: teleportAddr }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
