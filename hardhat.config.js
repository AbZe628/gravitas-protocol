// Učitaj varijable iz .env datoteke
require('dotenv').config(); 
require("@nomicfoundation/hardhat-toolbox"); 

// Ključ se sada čita samo kao ključ, bez "v2/"
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

// Koristimo Alchemy URL s placeholderom za ključ
const ALCHEMY_MAINNET_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  
  solidity: {
    compilers: [
      { version: "0.8.24" },
    ],
    settings: {
      optimizer: { enabled: true, runs: 200, },
      viaIR: true, 
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: ALCHEMY_MAINNET_URL, // Hardhat sada ima kompletan URL
        // Hardhat često automatski šalje ključ i kao Basic Auth ako je API ključ kratak
      },
    },
    // Dodajemo Arbitrum za deploy
    arbitrumOne: {
        url: process.env.ARBITRUM_RPC_URL, 
    }
  },
};