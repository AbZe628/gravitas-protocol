# 🌌 GRAVITAS PROTOCOL: DECENTRALIZED LIQUIDITY TELEPORT

This repository contains the architecture and the Minimum Viable Product (MVP) for the Gravitas Protocol. Our core mission is to solve DeFi liquidity fragmentation and generate sustainable protocol revenue through fee harvesting and atomic liquidity migration.

---

# 🚀 ARBITRUM GRANT REVIEW FOCUS: TELEPORT (MVP Proof-of-Concept)

**The primary focus for this grant review is the successful operation of the Liquidity Teleport functionality.**

The code proves the core concept: secure, atomic migration of liquidity between V2 pools on a single chain.

* **Contract for Review:** `contracts/Teleport.sol` (Orchestrates migration logic).
* **Proof of Concept:** Functionality is demonstrated via a **Mainnet Forking Test** (`test/teleport.test.js`).

---

## 🛠️ CRITICAL TECHNICAL NOTE FOR REVIEWERS

The core test uses **Ethereum Mainnet Forking** (via Alchemy RPC) to prove functionality with real tokens (WBTC/WETH) and actual Uniswap/Sushiswap Factory contracts.

1.  **Authorization:** Hardhat configuration (`hardhat.config.js`) securely uses the **`.env`** file and `ALCHEMY_API_KEY` for authentication.
2.  **Test Status:** If the test fails with an **`Error: 401 Unauthorized`**, this is due to an external Alchemy API limitation (e.g., rate limit, IP restriction), not a flaw in the contract logic.

### 💻 Step-by-Step Execution (For Reviewers)

To replicate the Mainnet Forking proof-of-concept, please follow these steps:

1.  **Clone the Repository and Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Setup Environment Variables:**
    Create a file named **`.env`** in the root directory and paste your valid Alchemy API Key (Ethereum Mainnet) into it:
    ```
    # Example: Paste your key from Alchemy Dashboard
    ALCHEMY_API_KEY="YOUR_ALCH_API_KEY_HERE" 
    ```
3.  **Execute the Mainnet Forking Test:**
    This single command performs contract compilation, initiates the Mainnet Fork on a random latest block, runs the full migration scenario (Impersonation, Approve, Transfer, Migrate, Check Balances), and reports the success.
    ```bash
    npm run test
    ```
    *(Alternatively: `npx hardhat test`)*

---
---

# 📖 CORE PROTOCOL ARCHITECTURE

Gravitas Protocol is an infrastructure layer that allows users and DeFi projects to move their LP tokens between DEXs instantly, safely, and with micro-fees that generate protocol income.

## ⚙️ I. ARCHITECTURE & COMPONENTS

The protocol is built around modular, secure contracts designed for extensibility across different AMM versions (V2/V3) and chains.

### Core Components (Vision & Current Status)

| Component | Status | Function |
| :--- | :--- | :--- |
| **Teleport.sol** | **MVP Complete** | The central coordinator. Executes atomic `remove-liquidity` → `transfer tokens` → `add-liquidity` flow. Secured with `nonReentrant`. |
| **Treasury.sol** | Planned (Phase 2) | Collects protocol fees (5-10 bps) and residual dust/value from migrations. Manages multi-sig treasury. |
| **Adapters** | MVP/Planned | Wrappers for external DEXs. Currently includes `UniV2Adapter.sol` (for context), with V3 adapters planned. |
| **Demo Tokens** | Complete | `TokenA.sol`/`TokenB.sol` used for local testing and scenario creation. |
| **Libraries** | Complete | Security and validation helpers (`ReentrancyGuard`, `SafeERC20`). |

### MVP Demonstrated Flow

The MVP successfully demonstrates the on-chain transition of assets:

`[User Wallet] → [Teleport.sol (Receives LP)] → [Teleport.sol (Calls Factory Burn)] → [Underlying Tokens] → [Teleport.sol (Calls Factory Mint)] → [New LP Tokens (Sent to Teleport)]`

## 📊 II. MVP STATUS AND TECHNICAL STACK

The current repository reflects the final state of the core migration logic.

| Scope/Item | Description | Status |
| :--- | :--- | :--- |
| **Core Logic** | V2 Liquidity Migration (Same-Chain) | ✅ Complete |
| **Security** | ReentrancyGuard implementation | ✅ Complete |
| **Test Coverage** | Full Mainnet Forking Test | ✅ Complete |
| **Code Structure** | Modular, using OpenZeppelin standards. | ✅ Complete |

### Technical Stack (Post-Cleanup)
* **Solidity:** 0.8.24 (optimized with `viaIR`)
* **EVM Framework:** Hardhat (v2.22.6)
* **Testing:** JavaScript (Ethers v6) / Chai
* **Security:** OpenZeppelin Contracts, `ReentrancyGuard`

## 💡 III. DEVELOPMENT ROADMAP (Full Vision)

| Phase | Description | Status |
| :--- | :--- | :--- |
| **Phase 1: MVP Core Logic** | Finalize secure single-chain V2 migration and testing (Current State). | ✅ Complete |
| **Phase 2: Protocol Revenue** | Implement **Treasury.sol** and fee harvesting logic into Teleport.sol. | 🔜 Planned |
| **Phase 3: Cross-Chain & V3** | Implement **UniV3/Curve Adapters**. Explore cross-chain migration via canonical bridges. | 🔜 Planned |
| **Phase 4: Audit & Launch** | Formal Security Audit (Code4rena/MythX) and Mainnet deployment on Arbitrum. | 🔜 Planned |

## ⚙️ REPOSITORY LAYOUT (Current, Clean State)

| Path | Description |
| :--- | :--- |
| `contracts/Teleport.sol` | Core coordinator for V2 liquidity migration. |
| `contracts/UniV2Adapter.sol` | Thin wrapper logic (used for context). |
| `test/teleport.test.js` | **The Mainnet Forking Test** (Proof of Concept). |
| `hardhat.config.js` | Final Hardhat configuration (JS, uses .env). |
| `.env` | **DO NOT COMMIT.** Stores `ALCHEMY_API_KEY` securely. |

---
*MIT © 2025 Gravitas Protocol*
