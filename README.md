# GRAVITAS PROTOCOL

**Institutional-Grade Shariah-Compliant Liquidity Infrastructure**

[![CI](https://github.com/AbZe628/gravitas-protocol/actions/workflows/ci.yml/badge.svg)](https://github.com/AbZe628/gravitas-protocol/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue.svg)](https://soliditylang.org/)
[![Audit: Internal Passed](https://img.shields.io/badge/Audit-Internal%20Passed-blueviolet.svg)](./proof-of-quality/SECURITY_AUDIT.md)

---

Our core contracts (TeleportV3: https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993#events  emits real on-chain events such as AtomicLiquidityMigrated, demonstrating actual liquidity migration with tracked input/output amounts on Arbitrum Sepolia.
 and GravitasPolicyRegistry: https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679#code
) are deployed and verified on Arbitrum Sepolia with real on-chain activity, demonstrating atomic liquidity migration and policy-enforced execution.


## Executive Summary

Gravitas Protocol is a **deep-tech infrastructure layer** designed to solve the fragmentation of liquidity in Decentralized Finance (DeFi). We provide **deterministic routing and liquidity migration logic** that allows capital to move efficiently across DEX ecosystems without friction, high costs, or technical opacity.

**Strategic Positioning**: Built from the ground up with **Shariah compliance** as a core governance principle, positioning the protocol as a primary gateway for the **$3 Trillion+ Islamic Finance market** to enter the Web3 ecosystem.

---

## The Problem: Liquidity Fragmentation

Currently, liquidity in DeFi is siloed. Moving capital from one protocol (e.g., Uniswap) to another (e.g., a lending protocol or another DEX) is:

| Challenge | Impact |
|-----------|--------|
| **Expensive** | Multiple approvals and gas fees |
| **Risky** | Exposure to slippage and MEV (Maximal Extractable Value) bots |
| **Manual** | Institutional players cannot automate this movement securely at scale |

---

## The Gravitas Solution: Deterministic Liquidity Routing

Gravitas acts as the **middleware layer** enabling "Deterministic Liquidity Routing." Users or institutions define an intent (e.g., "Move liquidity to the highest yield source within Shariah-compliant parameters"), and Gravitas executes the migration **atomically with guaranteed outcomes**.

### Core Principles

| Principle | Implementation |
|-----------|----------------|
| **Deterministic Execution** | Transactions revert entirely if parameters are not met |
| **Gharar Elimination** | Users know exactly what they receive before execution |
| **Policy-Constrained Routing** | All migrations validated against Shariah parameters |
| **Atomic Migration** | Remove Liquidity → Swap → Add Liquidity in ONE transaction |

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GRAVITAS PROTOCOL                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   Gravitas SDK  │───▶│  Policy Registry │───▶│   TeleportV3    │         │
│  │  (TypeScript)   │    │ (Risk & Compliance│    │ (Migration      │         │
│  │                 │    │     Oracle)       │    │    Engine)      │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│         │                       │                       │                   │
│         ▼                       ▼                       ▼                   │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                    COMPLIANCE FLOW                               │       │
│  │  Step 1: Intent Capture (SDK)                                   │       │
│  │  Step 2: Deterministic Pathing (Routing Engine)                 │       │
│  │  Step 3: Risk & Compliance Check (Policy Registry)              │       │
│  │  Step 4: Atomic Execution (TeleportV3)                          │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Description |
|-----------|-------------|
| **GravitasPolicyRegistry** | Risk & Compliance Oracle - validates assets, routers, and executors |
| **TeleportV3** | Deterministic Liquidity Routing Engine for Uniswap V3 positions |
| **Gravitas SDK** | TypeScript SDK for institutional integrations (Stripe-like DX) |

---

## Shariah Alignment & Certification Path

Gravitas Protocol treats Shariah compliance as a **technical requirement**, not a marketing label. We address the primary concerns of Islamic Finance in Web3:

| Principle | Implementation |
|-----------|----------------|
| **No Riba (Interest)** | Revenue via service fees, not interest-based lending |
| **Eliminating Gharar (Uncertainty)** | Deterministic routing removes ambiguity in execution |
| **Asset Whitelisting** | Filter non-compliant assets (gambling, alcohol tokens) |
| **No Maysir (Speculation)** | Filters gambling and speculative assets |

### Certification Roadmap

| Phase | Timeline | Status |
|-------|----------|--------|
| **Phase 1: Self-Regulation** | Current | ✅ Internal AAOIFI standards adherence |
| **Phase 2: Shariah Advisory Board** | Q3 2026 | 🔄 Engagement with recognized board |
| **Phase 3: Shariah Seal** | 2027 | 📋 Formal certification for GCC integration |

---

## Repository Structure

```
gravitas-protocol/
├── contracts/                    # Solidity smart contracts
│   ├── GravitasPolicyRegistry.sol   # Risk & Compliance Oracle
│   ├── TeleportV3.sol               # V3 Migration Engine
│   ├── Teleport.sol                 # V2 Migration Engine
│   └── interfaces/                  # External interfaces
├── gravitas-sdk/                 # TypeScript SDK
│   └── src/
│       ├── compliance.ts            # Shariah pre-flight checks
│       ├── teleport.ts              # Migration builder
│       └── types.ts                 # Type definitions
├── script/                       # Deployment scripts
│   └── DeployDeterministic.s.sol    # Foundry deployment script
├── test/                         # Test suites
│   └── foundry/                     # Foundry tests
├── proof-of-quality/             # Audit & test artifacts
│   ├── test_results.txt             # Test execution results
│   ├── gas_report.txt               # Gas snapshot report
│   └── SECURITY_AUDIT.md            # Internal security audit
├── DEPLOYMENT.md                 # Testnet deployment guide
└── deploy_testnet.sh             # One-click deployment script
```

---

## Quick Start

### Prerequisites

- [Foundry](https://getfoundry.sh/) (for smart contracts)
- [Node.js 20+](https://nodejs.org/) (for SDK)

### Installation

```bash
# Clone the repository
git clone https://github.com/AbZe628/gravitas-protocol.git
cd gravitas-protocol

# Install contract dependencies
npm install

# Install SDK dependencies
cd gravitas-sdk && npm install && cd ..

# Build contracts
forge build

# Run tests
forge test -vv
```

### SDK Usage

```typescript
import { GravitasClient } from '@gravitas/sdk';

const client = new GravitasClient({
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  registryAddress: '0x...',
  teleportV3Address: '0x...',
  chainId: 421614,
});

// Build and simulate a migration
const result = await client.migration()
  .tokenId(123n)
  .newFee(3000)
  .ticks(-887220, 887220)
  .slippage(0n, 0n, 0n, 0n)
  .deadline(BigInt(Math.floor(Date.now() / 1000) + 3600))
  .simulate(userAddress);
```

---

## Deployment

### Testnet (Arbitrum Sepolia)

```bash
# Configure environment
cp .env.example .env
# Edit .env with your RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY

# One-click deployment
chmod +x deploy_testnet.sh
./deploy_testnet.sh
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

---

## Security & Compliance

The protocol is built on the principle of **Gharar Elimination**. Every migration is an atomic transaction, ensuring a deterministic outcome.

| Audit Type | Status | Report |
|------------|--------|--------|
| Internal Security Review | ✅ Completed | [SECURITY_AUDIT.md](./proof-of-quality/SECURITY_AUDIT.md) |
| External Audit (OpenZeppelin) | 📋 Planned | Q2 2026 |
| Formal Verification | 📋 Planned | Q3 2026 |

### Security Features

- **Shariah Governance**: Enforced by the `GravitasPolicyRegistry`, which whitelists compliant assets and authorized routers.
- **Security Invariants**: Proven via Foundry fuzz testing, ensuring mathematical safety.
- **Deterministic Deployment**: Contracts deployed using `CREATE2` for predictable addresses across L2/L3 chains.
- **Reentrancy Protection**: All external-facing functions protected with ReentrancyGuard.
- **Gas Optimization**: Hot-path operations use Yul (Inline Assembly) for ~2,000 gas savings per call.

---

## Business Model

Gravitas utilizes a diversified, sustainable revenue model that scales with volume and adoption:

| Revenue Stream | Description |
|----------------|-------------|
| **Migration Fees** | Small fee per atomic migration (0.05-0.1%) |
| **SDK Licensing** | Enterprise SDK licenses for institutional integrations |
| **Compliance API** | Subscription access to compliance oracle |

---

## Team

**Abdusamed Zelic** — Founder & Lead Architect  
Deep-tech engineer with focus on smart contract security and protocol architecture.

---

## Contact

- **Website**: [gravitas.finance](https://gravitas.finance) (Coming Soon)
- **GitHub**: [github.com/AbZe628/gravitas-protocol](https://github.com/AbZe628/gravitas-protocol)
- **Email**: abdusamedzelic98@gmail.com

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Building Bank-Grade Infrastructure for the Next Generation of DeFi</strong>
</p>
