# Changelog

All notable changes to Gravitas Protocol are documented here.

## [0.1.0] — 2025-10-11 — MVP Release

### Added
- `GravitasPolicyRegistry` — on-chain Shariah compliance policy engine deployed on Arbitrum Sepolia
- `TeleportV3` — atomic V3 liquidity migration engine with EIP-712 signing and Yul-optimized gas
- `TeleportV2` — atomic V2 liquidity migration engine with cooldown and slippage protection
- TypeScript SDK (`@gravitas/sdk`) with Stripe-like developer experience
- React/TypeScript frontend deployed at gravitasprotocol.xyz
- 60-test Foundry test suite with 90%+ coverage
- Full monorepo structure with pnpm workspaces
- GitHub Actions CI/CD pipeline
- Whitepaper, technical specification, and investor documentation

### Contracts (Arbitrum Sepolia Testnet)
- GravitasPolicyRegistry: `0xbcaE3069362B0f0b80f44139052f159456C84679`
- TeleportV3: `0x5D423f8d01539B92D3f3953b91682D9884D1E993`

---

## [0.1.2] — 2026-07 — Security Hardening (Pre-Institutional-Sharing)

### Security
- `TeleportV3`: the EIP-712 `MigrationIntent` now binds **all** economic parameters — every
  slippage bound (`amount0MinMint`, `amount1MinMint`, `amount0MinDecrease`, `amount1MinDecrease`)
  and the full rebalancing-swap configuration (`executeSwap`, `zeroForOne`, `swapAmountIn`,
  `swapAmountOutMin`, `swapFeeTier`) — in addition to the position/tick/deadline/nonce fields.
  Previously these were unsigned, allowing an authorized executor to replay a valid owner
  signature with weakened economics (e.g. `swapAmountOutMin = 0`). `MIGRATION_TYPEHASH` and
  `_verifyIntent` updated accordingly.
- `GravitasPolicyRegistry`: `whenNotPaused` now gates every compliance-verification function
  (`verifyAssetCompliance`, `areTokensCompliant`, `verifyRouterAuthorization`,
  `verifyExecutorStatus`, `checkSubscriptionCompliance`). Pausing the registry is now a real,
  system-wide compliance kill switch that fails all integrators closed; previously the modifier
  guarded only `pause()`/`unpause()` and had no effect on enforcement.
- `TeleportV3.onlyAuthorized`: reordered so the protocol owner short-circuits before the
  (now pause-gated) registry call, preventing owner lockout at the authorization gate while
  keeping non-owner executors fail-closed under a registry pause.

### Changed
- SDK: added `buildMigrationTypedData()` / `MIGRATION_INTENT_TYPES` (`gravitas-sdk/src/eip712.ts`)
  so integrators sign the exact field set the on-chain verifier expects.
- Web app (`Migrate.tsx`): EIP-712 type and signed message expanded to the full parameter set,
  kept in lockstep with the contract.
- Docs: clarified "guaranteed outcomes" language to "atomic execution within owner-signed
  slippage bounds"; corrected the whitepaper readiness checklist to distinguish the completed
  internal review from the pending independent external audit.

### Tests
- Added `test_V3_SignatureBindsSwapMinOut`, `test_V3_SignatureBindsMintSlippage`,
  `test_Registry_VerifyFunctionsRevertWhenPaused`,
  `test_Registry_PauseHaltsExecutorAuthorizationSystemWide`,
  `test_Registry_UnpauseRestoresVerification`,
  `test_Registry_OwnerNotLockedOutOfAuthGateByRegistryPause`.
- Foundry suite: **66 tests passing** (up from 60), 0 failing.

### Contracts (Arbitrum Sepolia Testnet)
- Addresses unchanged from 0.1.0. **Redeployment required before these fixes take effect
  on-chain** — the currently deployed testnet bytecode predates this hardening.

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

### [0.2.0] — Next milestone (pre-mainnet)
- Independent external smart-contract audit (e.g. Hacken / Certik) — engagement pending
- Redeploy hardened contracts (0.1.2) to Arbitrum Sepolia, then Arbitrum One
- Shariah certification — Mufti Billal Omarjee (AmanX Advisory)
- Multisig governance for GravitasPolicyRegistry
- Mainnet deployment on Arbitrum One
