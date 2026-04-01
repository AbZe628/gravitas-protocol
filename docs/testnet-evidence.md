# Testnet Evidence & Deployment Verification

## 1. Overview

Gravitas Protocol is currently deployed on the **Arbitrum Sepolia Testnet**. This document provides the necessary evidence to verify the deployment, source code integrity, and functional coverage of the protocol's core smart contracts.

## 2. On-Chain Deployment Evidence

Both contracts are deployed, verified, and source-matched on Arbitrum Sepolia. Source code is publicly readable on Arbiscan — deployed bytecode matches the published Solidity source exactly.

| Contract | Arbiscan Link |
| :--- | :--- |
| GravitasPolicyRegistry | [View verified source](https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679#code) |
| TeleportV3 | [View verified source](https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993#code) |

## 3. Functional Coverage Evidence

Live atomic migration transactions require a funded Uniswap V3 position on testnet, which is deferred to post-seed infrastructure. The protocol's full execution path (including `swapExecuted=true`) is covered through 46 deterministic Foundry tests with >90% line coverage across core contracts. All tests pass in CI on every push to main.

---

## 4. Professional Statement

The Gravitas Protocol team confirms that the smart contracts listed above have been deployed to the Arbitrum Sepolia testnet for technical validation and integration testing. The deployment was successful, and the contracts are functioning as designed, adhering to the specifications outlined in the protocol's whitepaper and technical documentation.
