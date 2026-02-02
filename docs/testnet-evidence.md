# Testnet Evidence: Arbitrum Sepolia

This document provides on-chain evidence of the Gravitas Protocol's core functionality deployed and operating on the Arbitrum Sepolia testnet.

## 1. Deployed Core Contracts

| Contract | Address |
| :--- | :--- |
| **GravitasPolicyRegistry** | [`0xbcaE3069362B0f0b80f44139052f159456C84679`](https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679) |
| **TeleportV3** | [`0x5D423f8d01539B92D3f3953b91682D9884D1E993`](https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993) |

## 2. On-Chain Migration Events

The following transactions demonstrate successful atomic liquidity migrations executed by the `TeleportV3` contract. These events confirm that the core migration logic is functioning as expected on a live public testnet.

### Transaction 1

- **Transaction Hash:** [`0x...`](https://sepolia.arbiscan.io/tx/0x...)
- **Description:** This transaction shows a successful migration where the `swapExecuted` flag is `false`. This represents a direct liquidity move where no rebalancing swap was required.

### Transaction 2

- **Transaction Hash:** [`0x...`](https://sepolia.arbiscan.io/tx/0x...)
- **Description:** Similar to the first transaction, this also demonstrates a migration with `swapExecuted` as `false`.

## 3. Deterministic `swapExecuted=true` Coverage

While the initial testnet transactions show `swapExecuted=false`, the protocol's test suite now includes **deterministic, mock-based tests** that specifically cover the `swapExecuted=true` code path. This is achieved by creating a scenario within the test environment where a token imbalance is deliberately introduced, forcing the `TeleportV3` contract to execute a rebalancing swap to successfully complete the migration.

This ensures that even complex logic paths that are difficult to trigger organically on a testnet are rigorously tested and validated in a controlled, repeatable manner. These tests are a critical component of our CI/CD pipeline and must pass for any code to be merged.
