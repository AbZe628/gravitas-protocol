const hre = require("hardhat");

async function main() {
  console.log("Pripremam deploy TeleportV3 ugovora...");

  // Adrese za Arbitrum Sepolia (koje smo tražili u Remixu)
  const positionManagerAddress = "0x1238536071E1c677A632429e3655c799b22cDA52";
  const swapRouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

  // Dohvati ugovor
  const TeleportV3 = await hre.ethers.getContractFactory("TeleportV3");

  // Deploy s argumentima
  const teleport = await TeleportV3.deploy(positionManagerAddress, swapRouterAddress);

  console.log("Transakcija poslana, čekam potvrdu...");
  
  // Čekamo da se ugovor postavi
  await teleport.waitForDeployment(); 

  const address = await teleport.getAddress();
  console.log("----------------------------------------------------");
  console.log("USPJEH! TeleportV3 je deployan na adresu:", address);
  console.log("----------------------------------------------------");
  
  // Opcionalno: Naredba za verifikaciju koju možeš kopirati
  console.log(`Za verifikaciju pokreni:`);
  console.log(`npx hardhat verify --network arbitrumSepolia ${address} ${positionManagerAddress} ${swapRouterAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
