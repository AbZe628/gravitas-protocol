// Učitaj varijable iz .env datoteke (naša "ladica")
require('dotenv').config(); 
require("@nomicfoundation/hardhat-toolbox"); 

// Pročitaj URL za Arbitrum Sepolia
const ARBITRUM_SEPOLIA_URL = process.env.ARBITRUM_SEPOLIA_URL || '';
// Pročitaj 12 RIJEČI (Mnemonic)
const MNEMONIC = process.env.MNEMONIC || '';

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: { // Ovo je tvoj stari config, dobar je
    compilers: [
      { version: "0.8.24" },
    ],
    settings: {
      optimizer: { enabled: true, runs: 200, },
      viaIR: true, 
    },
  },

  // OVO JE GLAVNI DIO
  networks: {
    
    // Mreža za deploy na Arbitrum Testnet
    arbitrumSepolia: {
      url: ARBITRUM_SEPOLIA_URL, // Koristi URL iz .env
      
      // Koristimo tvojih 12 riječi da pronađemo "Account 1"
      accounts: {
        mnemonic: MNEMONIC,             // Kažemo mu da čita 12 riječi
        path: "m/44'/60'/0'/0",        // Standardna putanja
        initialIndex: 2,               // 0 = Account 1
        count: 1                       // Treba nam samo taj jedan račun
      },

      chainId: 421614 // Broj za Arbitrum Sepolia
    },

    // Lokalna mreža za testiranje
    hardhat: {
      // (ostavi prazno za sada)
    }
  },
};