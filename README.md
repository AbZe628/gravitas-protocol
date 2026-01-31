# 🌌 Gravitas Protocol: Institutional Core (Vortex Layer)

**Deterministic Liquidity Migration Infrastructure for Shariah-Aligned DeFi**

Gravitas Protocol is an engineering-first, deep-tech infrastructure layer designed to solve the systemic problem of liquidity fragmentation in Decentralized Finance (DeFi). We provide **Deterministic Liquidity Routing** and migration services, enabling institutional capital to move efficiently and compliantly across DEX ecosystems with guaranteed outcomes.

This repository contains the **Institutional MVP** of the Gravitas Protocol, refactored for security, modularity, and alignment with the institutional vision presented to Faith Capital.

---

## 🏛️ Technical Overview & Architectural Alignment

The core architecture is a **Hub-and-Spoke Model** centered around two key components: the **Teleport Engine** and the **Gravitas Policy Registry**.

### 1. Policy-Constrained Smart Routing

The protocol enforces the institutional mandate of **Shariah Governance** by integrating compliance checks directly into the smart contract execution flow. This addresses the core requirements of the $3 Trillion+ Islamic Finance market by eliminating **Gharar** (uncertainty) and ensuring **Asset Compliance**.

| Component | Function | Institutional Alignment |
| :--- | :--- | :--- |
| **Teleport.sol (V2/V3)** | Atomic Liquidity Migration (Burn -> Add/Mint) | Guarantees **Deterministic Execution**; transactions execute fully or revert entirely, eliminating intermediate state risk. |
| **GravitasPolicyRegistry.sol** | Centralized Compliance Oracle | Manages the **Asset Whitelist** and **Router Authorization**, ensuring all routed liquidity interacts only with Shariah-compliant assets and authorized venues. |
| **maxMoveBps / Cooldown** | On-chain Policy Enforcement | Provides risk controls for large-scale migrations, preventing sudden, destabilizing movements of capital. |

### 2. Multi-Chain Readiness

The contracts are designed to be **Chain-Agnostic** and modular. While the initial deployment is on Arbitrum, the architecture is prepared for future L2/L3 scaling and cross-chain messaging integration (e.g., LayerZero/CCIP), positioning Gravitas as a middleware layer for global liquidity.

---

## 🔐 Smart Contract Audit & Security Posture

The codebase has undergone a deep-dive audit and refactoring to meet **VC-ready** standards.

| Security Focus | Status | Implementation Detail |
| :--- | :--- | :--- |
| **Re-entrancy** | ✅ Fixed | All core migration functions are protected by OpenZeppelin's `nonReentrant` guard. |
| **Integer Safety** | ✅ Fixed | All contracts are built on Solidity `^0.8.24`, which utilizes checked arithmetic by default, mitigating overflow/underflow risks. |
| **Access Control** | ✅ Fixed | Migration functions are restricted to whitelisted **Executors** (Keepers/Institutions) managed by the `GravitasPolicyRegistry`, ensuring only authorized entities can trigger capital movements. |
| **Dust Griefing** | ✅ Fixed | `TeleportV3.sol` includes strict delta accounting and explicit refund logic to prevent dust accumulation and griefing attacks. |

---

## 📂 Repository Structure

| Path | Description |
| :--- | :--- |
| `contracts/Teleport.sol` | Core V2 (Router-Based) Liquidity Migration Engine. |
| `contracts/TeleportV3.sol` | Core V3 (NFT-Based) Liquidity Migration Engine. |
| `contracts/GravitasPolicyRegistry.sol` | **NEW**: Institutional Compliance and Governance Layer. |
| `test/gravitas.test.js` | **NEW**: Institutional-grade test suite covering compliance and policy logic. |
| `gravitas-sdk/` | Off-chain SDK for deterministic policy validation and transaction construction. |

### Deployment Instructions (Arbitrum Sepolia)

1.  **Deploy `GravitasPolicyRegistry.sol`**: This must be deployed first.
2.  **Configure Registry**: Use the `setAssetCompliance` and `setRouterAuthorization` functions to whitelist initial assets (e.g., USDC, WETH) and target DEX routers (e.g., Uniswap V2/V3, Camelot).
3.  **Deploy `Teleport.sol` / `TeleportV3.sol`**: Pass the deployed `GravitasPolicyRegistry` address into the constructor.
4.  **Set Executor**: Authorize the keeper/institution address via `registry.setExecutorStatus()`.

### Contract Addresses (Testnet)

| Contract | Network | Address |
| :--- | :--- | :--- |
| **Teleport.sol (V2)** | Arbitrum Sepolia | `0xA5a5397A141ea0d8f8e8A56c5BF95f66Cecf500B` (Original) |
| **TeleportV3.sol** | Arbitrum Sepolia | `0x89C0CB652BA4ad6B70d659dA9164FEf1415C3c4A` (Original) |
| **GravitasPolicyRegistry.sol** | *To be deployed* | *New deployment required for institutional version.* |

---

## 🤝 Shariah Governance Integration

The protocol is built on the principle of **Shariah-Alignment**, a core differentiator for institutional adoption.

> "Gravitas Protocol treats Shariah compliance as a technical requirement, not a marketing label. We address the primary concerns of Islamic Finance in Web3: Riba (Interest), Gharar (Uncertainty), and Maysir (Speculation)." — Gravitas Protocol Pitch Deck

The `GravitasPolicyRegistry` is the on-chain manifestation of this governance. It provides a transparent, auditable mechanism for:

1.  **Eliminating Gharar**: By enforcing strict policy checks (`maxMoveBps`, `cooldownSeconds`) and requiring all transactions to be **atomic**, the outcome is guaranteed and deterministic, removing the uncertainty (Gharar) associated with multi-step, non-atomic DeFi operations.
2.  **Asset Whitelisting**: The registry acts as the **Risk & Compliance Oracle**, ensuring that only assets pre-vetted for compliance (e.g., non-interest-bearing stablecoins, non-speculative tokens) can be routed through the protocol. This is the technical implementation of the **AAOIFI** (Accounting and Auditing Organization for Islamic Financial Institutions) standards in code logic.

This institutional-grade refactor ensures the code is technically compliant with the vision required for formal review by Faith Capital's technical team.
