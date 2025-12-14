require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Učitavanje varijabli
const ARBITRUM_SEPOLIA_URL = process.env.ARBITRUM_SEPOLIA_URL || "https://sepolia-rollup.arbitrum.io/rpc";
const MNEMONIC = process.env.MNEMONIC || "";

// Tvoj API ključ
const ARBISCAN_API_KEY = "HW3HXF2IX3SHXKK6JHE8MP8VFQ6HCXU5HS";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  // OVDJE JE BIO PROBLEM: Sada su postavke ispravno strukturirane
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // OVO RJEŠAVA "STACK TOO DEEP" ERROR
    },
  },
  networks: {
    arbitrumSepolia: {
      url: ARBITRUM_SEPOLIA_URL,
      chainId: 421614,
      accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0",
        initialIndex: 2, // Zadržao sam tvoj index 2 (pazi da imaš ETH na tom računu!)
        count: 1
      },
    },
  },
  etherscan: {
    apiKey: {
      arbitrumSepolia: ARBISCAN_API_KEY,
    },
    // Dodajemo customChains za svaki slučaj (Arbiscan ponekad treba ovo)
    customChains: [
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
};