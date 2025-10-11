import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1) Tokens
  const TKA = await ethers.getContractFactory("TokenA");
  const TKB = await ethers.getContractFactory("TokenB");
  const tka = await TKA.deploy();
  const tkb = await TKB.deploy();
  await tka.waitForDeployment();
  await tkb.waitForDeployment();

  // 2) WETH
  const WETH9 = await ethers.getContractFactory("WETH9");
  const weth = await WETH9.deploy();
  await weth.waitForDeployment();

  // 3) Two factories (A,B) + routers (ne koristimo ih u manual migraciji, ali dobro je imati ih za demo)
  const Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factoryA = await Factory.deploy(deployer.address);
  const factoryB = await Factory.deploy(deployer.address);
  await factoryA.waitForDeployment();
  await factoryB.waitForDeployment();

  const Router = await ethers.getContractFactory("UniswapV2Router02");
  const routerA = await Router.deploy(await factoryA.getAddress(), await weth.getAddress());
  const routerB = await Router.deploy(await factoryB.getAddress(), await weth.getAddress());
  await routerA.waitForDeployment();
  await routerB.waitForDeployment();

  // 4) Teleport (NOVO: nema više constructor argumenata!)
  const Teleport = await ethers.getContractFactory("Teleport");
  const teleport = await Teleport.deploy();
  await teleport.waitForDeployment();

  // 5) Kreiraj par na A i mintaj LP direktno Teleportu (nema routera)
  const tkaAddr = await tka.getAddress();
  const tkbAddr = await tkb.getAddress();
  await (await factoryA.createPair(tkaAddr, tkbAddr)).wait();
  const pairA = await factoryA.getPair(tkaAddr, tkbAddr);
  if (pairA === ethers.ZeroAddress) throw new Error("PairA not created");

  const amt = ethers.parseEther("1000");
  await (await tka.transfer(pairA, amt)).wait();
  await (await tkb.transfer(pairA, amt)).wait();

  const pairAContract = await ethers.getContractAt(
    "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair",
    pairA
  );
  await (await pairAContract.mint(await teleport.getAddress())).wait();

  // 6) Zapiši adrese
  const deployed = {
    tka: tkaAddr,
    tkb: tkbAddr,
    weth: await weth.getAddress(),
    factoryA: await factoryA.getAddress(),
    routerA: await routerA.getAddress(),
    factoryB: await factoryB.getAddress(),
    routerB: await routerB.getAddress(),
    teleport: await teleport.getAddress(),
    pairA,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
  };

  console.log(deployed);
  fs.writeFileSync("addresses.json", JSON.stringify(deployed, null, 2));
  console.log("addresses.json written.");
}

main().catch((e) => { console.error(e); process.exit(1); });
