# 📦 @gravitas/sdk

**Enterprise-Grade Shariah-Compliant Liquidity Routing SDK**

The Gravitas SDK provides institutional-grade tools for interacting with the Gravitas Protocol. It features **Shariah Pre-Flight Checks**, strict runtime validation via **Zod**, and type-safe EVM interactions via **Viem**.

---

## 🚀 Quick Start (3 Lines)

```typescript
import { GravitasClient } from '@gravitas/sdk';

const client = new GravitasClient({ rpcUrl: '...', registryAddress: '0x...', teleportV3Address: '0x...', chainId: 42161 });
const tx = await client.migration().tokenId(123n).newFee(500).ticks(-100, 100).simulate(myAddress);
```

---

## 🏛️ Institutional Features

### 1. Shariah Pre-Flight Checks
The SDK automatically queries the `GravitasPolicyRegistry` before any transaction simulation. If an asset or router is non-compliant, it throws a `ShariahViolationError` immediately, preventing non-compliant transactions from ever reaching the mempool. This is a critical safety feature for banks and institutional funds.

### 2. Fluent Builder API
Construct complex V3 migrations with a human-readable, chainable API that reduces developer error and improves auditability.
```typescript
const migration = client.migration()
  .tokenId(123n)
  .newFee(3000)
  .ticks(-887220, 887220)
  .slippage(minMint0, minMint1, minDec0, minDec1)
  .deadline(deadline);
```

### 3. Strict Type Safety
Built with TypeScript 5.x and Viem, providing full autocompletion and compile-time safety for all contract interactions. No `any` types are used in the core logic, ensuring robust enterprise integrations.

---

## 🛠️ Installation

```bash
npm install @gravitas/sdk viem zod
```

## ⚖️ License
MIT © Gravitas Protocol Labs
