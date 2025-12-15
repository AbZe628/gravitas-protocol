🌌 Gravitas Protocol (Vortex Layer)
Deterministic Cross-DEX Liquidity Migration Infrastructure for Arbitrum

Gravitas Protocol (Vortex Layer) is a developer-first liquidity infrastructure layer designed to eliminate liquidity fragmentation across decentralized exchanges on Arbitrum.

The protocol enables atomic, policy-driven liquidity migration — allowing LP positions and Uniswap V3 NFTs to be moved safely between DEXs using standard router logic, strict on-chain enforcement, and zero custodial risk.

This repository contains:

✅ Reviewer-Proof MVP (Teleport V2) — deployed & verified

✅ Uniswap V3 Teleport (Teleport V3) — deployed & verified

🧪 Advanced / Audit-grade evolution (Teleport V6) — reference implementation

🚀 Arbitrum Grant Status

Category: Developer Tooling

Scope: On-chain liquidity infrastructure for DEXs, vaults, aggregators & keepers

Status: MVP deployed, verified, reproducible

Important:
The Arbitrum grant review focuses primarily on Teleport V2 as the canonical MVP.
Teleport V3 is included as a live proof of extensibility toward Uniswap V3.

🧩 Core Design Principles
🔐 Deterministic Execution

Each migration:

Executes fully or reverts entirely

Never leaves assets in an intermediate state

🧠 Policy-Driven by Default

All migrations enforce:

Router allow-listing

Slippage constraints

Execution deadlines

Cooldowns

Maximum liquidity caps

Everything is enforced on-chain, not via off-chain promises.

🔹 Teleport V2 — Reviewer-Proof MVP (Router-Based)
Purpose

Teleport V2 is the official Arbitrum grant MVP.
It demonstrates safe LP migration using standard router logic (addLiquidity) instead of unsafe raw token transfers.

What It Does

Burns LP tokens from a source pool

Receives underlying tokens

Re-deposits liquidity via an allowed router

Refunds dust safely

Enforces deterministic safety constraints

All steps execute atomically in one transaction.

📍 Live Deployment — Teleport V2 (MVP)

Network: Arbitrum Sepolia

Chain ID: 421614

Contract: Teleport.sol

Address:

0xA5a5397A141ea0d8f8e8A56c5BF95f66Cecf500B


Arbiscan (Exact Match, Verified):
https://sepolia.arbiscan.io/address/0xA5a5397A141ea0d8f8e8A56c5BF95f66Cecf500B#code

Sourcify Verification:
https://repo.sourcify.dev/421614/0xA5a5397A141ea0d8f8e8A56c5BF95f66Cecf500B

🔐 Teleport V2 — Safety Model

Owner & optional executor whitelist

Router allow-listing (blocked by default)

Cooldown & max-move-BPS enforcement

Uses OpenZeppelin SafeERC20 + forceApprove

No direct ERC20 → pool transfers

🔄 Teleport V2 — Execution Flow
[LP Holder / Executor]
        ↓ approve LP
[Teleport.sol]
        ↓ burn LP
[Underlying Tokens]
        ↓ addLiquidity (router)
[Target Pool]
        ↓
[New LP → Recipient]

🔹 Teleport V3 — Uniswap V3 Liquidity Teleport (Live)
Purpose

Teleport V3 demonstrates atomic migration of Uniswap V3 NFT positions, including:

Liquidity removal

Fee collection

Optional auto-swap rebalancing

Minting of a new V3 position

This contract proves Gravitas is not limited to V2-style LPs.

📍 Live Deployment — Teleport V3

Network: Arbitrum Sepolia

Contract: TeleportV3.sol

Address:

0x89C0CB652BA4ad6B70d659dA9164FEf1415C3c4A


Arbiscan (Verified):
https://sepolia.arbiscan.io/address/0x89C0CB652BA4ad6B70d659dA9164FEf1415C3c4A#code

✨ Teleport V3 — Capabilities

Handles Uniswap V3 NFT positions

Supports auto-swap to rebalance token ratios

Uses standard Uniswap V3 Position Manager & Swap Router

Fully atomic execution

Non-custodial by design

Note: Teleport V3 is not required for the MVP grant scope, but included as a live proof of extensibility.

🔹 Teleport V6 — Advanced / Audit-Grade Reference

Teleport V6 represents the final evolution of the Uniswap V3 teleporter, designed for audit readiness and keeper-based execution.

Key Features

Explicit ownerOf() NFT ownership check

Strict delta accounting (anti-dust-griefing)

Old NFT burn (state cleanup)

Keeper / executor execution model

Rich events for analytics & indexing

This version demonstrates long-term architectural direction, not immediate grant scope.

📂 Repository Structure
contracts/
 ├─ Teleport.sol        # V2 Router-Based MVP (Grant Scope)
 ├─ TeleportV3.sol      # Live Uniswap V3 Teleport
 ├─ TeleportV6.sol      # Advanced / Audit Reference
scripts/
 ├─ deploy.ts
test/
 ├─ fork.teleport.test.ts

🧭 Scope Clarity
Component	Status	Purpose
Teleport V2	✅ Live	Arbitrum Grant MVP
Teleport V3	✅ Live	Uniswap V3 Extension
Teleport V6	🧪 Reference	Audit-grade evolution
SDK / API	🚧 Planned	Developer Tooling
Adapters	🚧 Planned	Multi-DEX Support
🛣️ Roadmap (High-Level)

Milestone 1: Mainnet deployment (V2)

Milestone 2: SDK + Adapter templates

Milestone 3: Advanced routing + Orbit tooling

🧑‍💻 Author

Abdusamed Zelić
Founder & Lead Architect
Gravitas Protocol / Vortex Layer

Strategic Incubation Partner (GCC):
Phoenix Trading Ent
https://www.linkedin.com/company/phoenix-trading-ent/
ovo sam napravio


ovo je moj tekst prestani ga skracivati samo ga uredi i izbaci v6
