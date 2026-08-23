# Testnet Evidence & Deployment Verification

## 1. Overview

Gravitas Protocol is currently deployed on the **Arbitrum Sepolia Testnet**. This document provides the necessary evidence to verify the deployment, source code integrity, and functional coverage of the protocol's core smart contracts.

## 2. On-Chain Deployment Evidence

Both contracts are deployed, verified, and source-matched on Arbitrum Sepolia. Source code is publicly readable on Arbiscan — deployed bytecode matches the published Solidity source exactly.

| Contract | Arbiscan Link |
| :--- | :--- |
| GravitasPolicyRegistry | [View verified source](https://sepolia.arbiscan.io/address/0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23#code) |
| TeleportV3 | [View verified source](https://sepolia.arbiscan.io/address/0x6702C2CE6eD58ca3934eBBd785CaC1De8DCd85B4#code) |

## 3. Functional Coverage Evidence

Live atomic migration transactions require a funded Uniswap V3 position on testnet, which is deferred to post-seed infrastructure. The protocol's full execution path (including `swapExecuted=true`) is covered through 46 deterministic Foundry tests with >90% line coverage across core contracts. All tests pass in CI on every push to main.

---

## 4. Professional Statement

The Gravitas Protocol team confirms that the smart contracts listed above have been deployed to the Arbitrum Sepolia testnet for technical validation and integration testing. The deployment was successful, and the contracts are functioning as designed, adhering to the specifications outlined in the protocol's whitepaper and technical documentation.
