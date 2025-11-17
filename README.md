# 🌌 GRAVITAS PROTOCOL (Rebranding to: VORTEX LAYER)

> **⚠️ NOTICE TO ARBITRUM GRANT REVIEWERS:**
>
> Please note: This project (**Gravitas Protocol**) is a developer tooling infrastructure for liquidity optimization.
>
> It is **unrelated** to the existing *Gravita Protocol* (Lending/Stablecoin).
> We are currently operating under this working title for the MVP grant submission but are currently rebranding to **"Vortex Layer"** to prevent any ecosystem confusion.

---

This repository contains the architecture and the Minimum Viable Product (MVP) for the Gravitas Protocol (soon Vortex Layer). Our core mission is to solve DeFi liquidity fragmentation on Arbitrum and generate sustainable protocol revenue through fee harvesting and atomic liquidity migration.

---> _Resubmitted under Developer Tooling domain per Arbitrum review team recommendation (Nov 2025)._

## 🏆 LIVE PROOF OF DEPLOYMENT (ARBITRUM SEPOLIA)

The Protocol MVP contract (`Teleport.sol`) has been successfully **deployed, verified, and tested live on the Arbitrum Sepolia testnet**. This demonstrates full end-to-end functionality, from RPC connection to on-chain "write" execution.

### 1. ✅ Verified Contract
The core protocol logic is live and source-code verified on Arbiscan (Green Checkmark).
👉 **[View Contract on Arbiscan](https://sepolia.arbiscan.io/address/0xb2ffB8704a2bb15c4AFc37789d9C0b598Cb79f64#code)**

### 2. ✍️ Live 'Write' Transaction
We executed a live "write" call to the deployed contract (transferring ownership) to prove control and functionality.
👉 **[View Transaction Proof](https://sepolia.arbiscan.io/tx/0xa1bc6c05460a7da043e7fe94620ac90a7c313857ef0d0485a285f981726a6d18)**

---

## 🚀 ARBITRUM GRANT REVIEW FOCUS: TELEPORT (MVP Proof-of-Concept)

**The primary focus for this grant review is the successful operation of the Liquidity Teleport functionality.**

The code proves the core concept: secure, atomic migration of liquidity between V2 pools on a single chain.

* **Contract for Review:** `contracts/Teleport.sol` (Orchestrates migration logic).
* **Proof of Concept:** Functionality is also demonstrated via a **Mainnet Forking Test** (`test/teleport.test.js`).

## 🧠 Security & Audit Plan
* **Pre-Audit:** Internal static analysis (Slither + Mythril).
* **Milestone 2:** Scheduled formal audit (Code4rena or Hacken).
* **Post-Launch:** Community bug bounty program.

---

## ⚙️ REPOSITORY LAYOUT & ARCHITECTURE

Gravitas Protocol is an infrastructure layer that allows users and DeFi projects to move their LP tokens between DEXs instantly, safely, and with micro-fees that generate protocol income.

### Core Components (Vision & Current Status)

| Component | Status | Function |
| :--- | :--- | :--- |
| **Teleport.sol** | **MVP Complete** | The central coordinator. Executes atomic `remove-liquidity` → `transfer tokens` → `add-liquidity` flow. Secured with `nonReentrant`. |
| **Treasury.sol** | Planned (Phase 2) | Collects protocol fees (5-10 bps) and residual dust/value from migrations. Manages multi-sig treasury. |
| **Adapters** | MVP/Planned | Wrappers for external DEXs. Currently includes `UniV2Adapter.sol` (for context), with V3 adapters planned. |
| **Demo Tokens** | Complete | `TokenA.sol`/`TokenB.sol` used for local testing and scenario creation. |

### MVP Demonstrated Flow

The MVP successfully demonstrates the on-chain transition of assets:

`[User Wallet] → [Teleport.sol (Receives LP)] → [Teleport.sol (Calls Factory Burn)] → [Underlying Tokens] → [Teleport.sol (Calls Factory Mint)] → [New LP Tokens (Sent to Teleport)]`

---

## 🛠️ TECHNICAL STACK & SETUP

The current repository reflects the final state of the core migration logic.

| Scope/Item | Description | Status |
| :--- | :--- | :--- |
| **Core Logic** | V2 Liquidity Migration (Same-Chain) | ✅ Complete |
| **Security** | ReentrancyGuard implementation | ✅ Complete |
| **Verification** | Etherscan/Arbiscan Source Verification | ✅ Complete |
| **Code Structure** | Modular, using OpenZeppelin standards. | ✅ Complete |

### How to verify locally?

1.  **Clone the Repository and Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Setup Environment Variables:**
    Create a file named **`.env`** in the root directory and paste your Alchemy/Infura Key.
3.  **Execute Tests:**
    ```bash
    npx hardhat test
    ```

### Arbitrum Runtime Assumptions
Gravitas Teleport operates under L2-specific constraints: sequencer downtime and oracle staleness are handled via policy guards (pause & deadline enforcement), gas estimation is Arbitrum-optimized (EIP-1559 style), and all adapter calls respect L2 retry semantics.

---

## 💡 DEVELOPMENT ROADMAP

| Phase | Description | Status |
| :--- | :--- | :--- |
| **Phase 1: MVP Core Logic** | Finalize secure single-chain V2 migration and testing (Current State). | ✅ Complete |
| **Phase 2: Protocol Revenue** | Implement **Treasury.sol** and fee harvesting logic into Teleport.sol. | 🔜 Planned |
| **Phase 3: Cross-Chain & V3** | Implement **UniV3/Curve Adapters**. Explore cross-chain migration via canonical bridges. | 🔜 Planned |
| **Phase 4: Audit & Launch** | Formal Security Audit (Code4rena/MythX) and Mainnet deployment on Arbitrum. | 🔜 Planned |

---
*MIT © 2025 Gravitas Protocol (Vortex Layer)*
**Developed by Abdusamed Zelić** – Founder & Lead Engineer
