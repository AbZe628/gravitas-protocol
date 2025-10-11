import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-network-helpers";
import "hardhat-dependency-compiler";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    // Tri kompajlera: naš kod (0.8.24), periphery (0.6.6), core (0.5.16)
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true, // <<< KLJUČNO za "Stack too deep" u Teleport.sol
        },
      },
      {
        version: "0.6.6",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
      {
        version: "0.5.16",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
    ],
    overrides: {
      // Forsiraj točne verzije za Uniswap dependencyje
      "@uniswap/v2-periphery/contracts/**/*.sol": {
        version: "0.6.6",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
      "@uniswap/v2-core/contracts/**/*.sol": {
        version: "0.5.16",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
      // (nije nužno, ali eksplicitno možemo reći da naš repo ostaje na 0.8.24 + viaIR)
      "contracts/**/*.sol": {
        version: "0.8.24",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true,
        },
      },
    },
  },

  // Kompajlirajmo Uniswap dependencyje bez naših import .sol fajlova
  dependencyCompiler: {
    paths: [
      "@uniswap/v2-core/contracts/UniswapV2Factory.sol",
      "@uniswap/v2-periphery/contracts/UniswapV2Router02.sol",
    ],
  },

  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
  },
};

export default config;
