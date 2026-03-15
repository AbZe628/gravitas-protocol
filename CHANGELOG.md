# Changelog

All notable changes to Gravitas Protocol are documented here.

## [0.1.0] — 2025-10-11 — MVP Release

### Added
- `GravitasPolicyRegistry` — on-chain Shariah compliance policy engine deployed on Arbitrum Sepolia
- `TeleportV3` — atomic V3 liquidity migration engine with EIP-712 signing and Yul-optimized gas
- `TeleportV2` — atomic V2 liquidity migration engine with cooldown and slippage protection
- TypeScript SDK (`@gravitas/sdk`) with Stripe-like developer experience
- React/TypeScript frontend deployed at gravitasprotocol.xyz
- 46-test Foundry test suite with 90%+ coverage
- Full monorepo structure with pnpm workspaces
- GitHub Actions CI/CD pipeline
- Whitepaper, technical specification, and investor documentation

### Contracts (Arbitrum Sepolia Testnet)
- GravitasPolicyRegistry: `0xbcaE3069362B0f0b80f44139052f159456C84679`
- TeleportV3: `0x5D423f8d01539B92D3f3953b91682D9884D1E993`

---

## [0.1.1] — 2026-03 — Governance Upgrade

### Changed
- `GravitasPolicyRegistry`: Upgraded from `Ownable` to `Ownable2Step` for safer ownership transfers
- Added `contracts/governance/GravitasTimelock.sol` — TimelockController for production multisig governance
- Added `contracts/governance/MultisigSetup.md` — Production deployment guide for Gnosis Safe + Timelock

### Security
- Eliminates single private key risk for compliance policy management
- 48-hour timelock delay recommended for mainnet production configuration
- Full Gnosis Safe integration guide provided for GCC institutional deployment

---

## Upcoming

### [0.2.0] — Planned Q2 2026
- Tier-2 smart contract audit (Hacken or Certik)
- Shariah certification — Mufti Billal Omarjee (AmanX Advisory)
- Multisig governance for GravitasPolicyRegistry
- Mainnet deployment on Arbitrum One
