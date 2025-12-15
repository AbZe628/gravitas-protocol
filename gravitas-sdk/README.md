# Gravitas Protocol SDK (v0.1)

**Developer Tooling for Gravitas Protocol (Vortex Layer) on Arbitrum.**

> **Note to Reviewers:** This SDK serves as the integration layer for the `Teleport.sol` contract. It enforces strict separation of concerns: the SDK handles policy validation and simulation, while the contract handles atomic execution.

## Architectural Overview

The SDK is designed as a stateless B2B infrastructure tool. It does not manage wallet state or private keys. Its primary responsibility is to deterministically generate valid `MigrationPolicy` objects and simulation results for execution agents.

### Core Flows

1.  **Validation**: Strict checking of deadlines, slippage bounds, and adapter compatibility.
2.  **Simulation**: Off-chain dry-runs calculating expected output vs. `minLpOut` constraints.
3.  **Construction**: Generation of raw transaction payloads for the `Teleport` contract.

## Usage

### 1. Initialization

```typescript
import { GravitasClient, ChainId } from "@gravitas-protocol/sdk";

const client = new GravitasClient({
  rpcUrl: "[https://sepolia-rollup.arbitrum.io/rpc](https://sepolia-rollup.arbitrum.io/rpc)",
  chainId: ChainId.ARBITRUM_SEPOLIA,
  teleportAddress: "0x..." // Deployed Teleport.sol
});
