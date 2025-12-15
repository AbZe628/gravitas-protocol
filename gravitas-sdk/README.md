Gravitas Protocol SDK (v0.1)

Developer tooling for Gravitas Protocol (Vortex Layer) on Arbitrum.

Note to Reviewers:
This SDK serves as the integration layer for the Teleport.sol contract.
It enforces a strict separation of concerns:
– the SDK handles policy validation, simulation, and calldata construction
– the smart contract handles atomic on-chain execution

Architectural Overview

The Gravitas SDK is a stateless, B2B infrastructure tool designed for
DEX integrators, vault managers, and execution agents.

It does not:
– manage wallets or private keys
– sign transactions
– custody or move funds

Its responsibility is to deterministically prepare safe, verifiable
execution inputs for the Teleport.sol smart contract.

Core Flows

Validation
Strict local validation of migration intent:
– deadline buffers
– slippage bounds
– adapter compatibility

Simulation
Off-chain dry-run of the migration flow to:
– estimate expected outputs
– verify minLpOut constraints
– surface deterministic failure reasons

Construction
Generation of raw transaction payloads (to, data, value)
for execution via Teleport.sol.

Usage

Initialization

Import GravitasClient and ChainId from the SDK.

Create a new GravitasClient with:
– rpcUrl pointing to Arbitrum Sepolia
– chainId set to ARBITRUM_SEPOLIA
– teleportAddress set to the deployed Teleport.sol contract

Define Migration Policy

A MigrationPolicy is a plain JavaScript / TypeScript object that defines
deterministic execution intent.

Example policy fields:
– sourceAdapterId: "uniswap_v2"
– targetAdapterId: "camelot_v2"
– tokenA: address
– tokenB: address
– liquidityAmount: bigint (LP tokens to migrate)
– minLpOut: bigint (minimum LP tokens expected after migration)
– deadline: unix timestamp (seconds)
– slippageBps: basis points (e.g. 50 = 0.5%)

Simulate & Build

Step 1: Validate locally
Call validateMigrationPolicy(policy) to ensure the policy satisfies
all deterministic constraints.

Step 2: Simulate off-chain
Call simulateMigration(policy) to estimate output values and gas usage.

If simulation succeeds:
– read estimatedGas
– proceed to build the transaction payload

Step 3: Build transaction
Call buildMigrationTx(policy) to generate raw calldata.

Step 4: Execute externally
Execution is performed by an external signer or keeper.
The SDK never signs or sends transactions.

Supported Adapters (v0.1)

Adapter ID: uniswap_v2
Protocol: Uniswap V2 and compatible forks
Notes: Reference adapter template

Adapter ID: camelot_v2
Protocol: Camelot V2
Notes: Reference adapter template

Adapter registry entries in v0.1 use static configuration and placeholder
addresses. Production versions will resolve adapters dynamically.

Security & Design Notes

– The SDK cannot execute migrations on its own
– All fund movement is handled exclusively by Teleport.sol
– Policy validation is intentionally strict to reduce on-chain revert risk
– Simulation results may diverge from on-chain execution due to state changes

v0.1 Scope Limitations

– No real-time on-chain reserve fetching (mock reserve logic only)
– No permissionless execution logic
– Adapter registry is static for the alpha phase

This release establishes the SDK architecture and developer integration surface.
Future versions will expand adapter coverage, integrate live data sources,
and support Orbit chain configurations.

Threat Model (v0.1)

– SDK does not custody or move funds
– SDK does not sign transactions
– Execution authority remains fully on-chain
– Off-chain simulations are advisory only

Built for the Arbitrum ecosystem.
