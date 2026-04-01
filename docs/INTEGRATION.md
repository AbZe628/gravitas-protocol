# Gravitas Protocol — Integration Guide

This guide covers how to integrate the Gravitas Protocol SDK into your application.

## Prerequisites

- Node.js 22+
- pnpm 10+ (or npm/yarn)
- An Ethereum-compatible wallet (MetaMask or equivalent)
- Access to Arbitrum Sepolia testnet (for development)

## Installation

```bash
npm install @gravitas/sdk
# or
pnpm add @gravitas/sdk
```

## Quick Start

```typescript
import { GravitasClient } from '@gravitas/sdk';

const client = new GravitasClient({
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  chainId: 421614,
  registryAddress: '0xbcaE3069362B0f0b80f44139052f159456C84679',
  teleportV3Address: '0x5D423f8d01539B92D3f3953b91682D9884D1E993',
});
```

## Check Asset Compliance

```typescript
await client.compliance.validateAsset(\'0xTokenAddress...\');
console.log(\'Asset compliant: ✅ Compliant\');
```
## Simulate a V3 Migration

```typescript
const migration = client.migration()
  .tokenId(123n)
  .newFee(3000)
  .ticks(-887220, 887220)
  .slippage(0n, 0n, 0n, 0n)
  .deadline(BigInt(Math.floor(Date.now() / 1000) + 3600));

const simulation = await migration.simulate(\'0xYourWalletAddress...\', \'0x\');
console.log(\'Estimated gas:\', simulation.gasEstimate);
```


## Contract Addresses

| Network | Contract | Address |
|---|---|---|
| Arbitrum Sepolia (testnet) | GravitasPolicyRegistry | `0xbcaE3069362B0f0b80f44139052f159456C84679` |
| Arbitrum Sepolia (testnet) | TeleportV3 | `0x5D423f8d01539B92D3f3953b91682D9884D1E993` |
| Arbitrum One (mainnet) | GravitasPolicyRegistry | TBD — post-audit |
| Arbitrum One (mainnet) | TeleportV3 | TBD — post-audit |

## Error Handling

The SDK throws typed errors for all known contract revert conditions:

| Error | Meaning |
|---|---|
| `AssetNotCompliant` | Token is not on the Shariah-compliant whitelist |
| `CooldownNotMet` | V2 migration cooldown period has not elapsed |
| `InvalidSignature` | EIP-712 signature is invalid or expired |
| `DeadlineExpired` | Transaction deadline has passed |
| `SlippageExceeded` | Output amount below minimum threshold |

## Support

For integration support: abdusamed@gravitasprotocol.xyz  
Documentation: https://gravitasprotocol.xyz/docs  
GitHub: https://github.com/AbZe628/gravitas-protocol
