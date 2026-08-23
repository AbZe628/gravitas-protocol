# Changelog

All notable changes to Gravitas Protocol are documented here.

## [0.1.3] — 2026-08-23 — Redeployment

The contracts on chain are now the contracts in this repository. Until this release they
were not: the deployed bytecode was 0.1.0 and carried no pause, no two-step ownership, no
policy version history and no EIP-712 signed intent, while the source here had all four.
Three faults were fixed before deploying, because shipping any of them would have committed
the fault and cost a second deployment.

### Contracts (Arbitrum Sepolia)

| Contract | Address |
|---|---|
| GravitasPolicyRegistry | `0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23` |
| TeleportV3 | `0x6702C2CE6eD58ca3934eBBd785CaC1De8DCd85B4` |
| TeleportV2 | `0xEDfF3dFdcdd7C04B11d9B614d5E0cd368f1e93c0` |
| GravitasTimelock | `0xbFFAd90B2607e3E5926260B640BbcD1E128680Ba` |

Superseded: registry `0xbcaE3069362B0f0b80f44139052f159456C84679`, TeleportV3
`0x5D423f8d01539B92D3f3953b91682D9884D1E993`.

### Fixed

- **The policy hash did not commit to the policy.** It hashed the block timestamp, the
  sender and the version number — metadata about the write, carrying nothing derived from
  the whitelist. Two entirely different registries produced the same hash when written in
  the same block by the same owner at the same version. Each change is now folded into the
  hash before it, tagged with which register it touched, so `policyHistory[v]` commits to
  the ordered sequence that produced version v and can be replayed from `PolicyUpdated`
  events and compared.
- **The dust refund dropped the ERC-20 return value.** Hand-written assembly checked only
  whether the call reverted, never the returned boolean. Against a token that reports
  failure by returning false, the dust stayed in the contract while the migration reported
  success. It now goes through `SafeERC20`, and there is a test with a token that lies in
  exactly that way.
- **TeleportV3 pointed at a swap router with no code.** `0xE592...1564` does not exist on
  Arbitrum Sepolia, so the rebalancing swap was dead on arrival and would have stayed dead
  through a redeploy. The network carries SwapRouter02, whose params struct has no
  `deadline` field and whose selector differs; the interface and the mock now match it. The
  deadline is still rejected before any external call and is bound into the signed intent.
- Approvals granted to the position manager and the swap router are reset after use.
- The constructor's own executor grant is recorded in the event log and the hash chain
  instead of happening silently.
- A write that sets a value to what it already holds no longer advances the version, so the
  record stops counting non-changes as policy decisions.

### Changed

- `script/Deploy.s.sol` deploys all four contracts and refuses to run if either Uniswap
  address has no code on the target network.
- `script/TransferOwnershipToTimelock.s.sol` rewritten as propose-then-execute. The registry
  is Ownable2Step, so the earlier bare `transferOwnership` against a hard-coded address
  would have left it nominated, never accepted, with the deployer still in control.
- The deploy takes its key from `--interactive` or `--account` when `DEPLOYER_KEY` is unset,
  so the key need not be written into the shell history.

### Tests

79 passing, up from 66. Line coverage: registry 82.50% → 95.56%, TeleportV3 88.00% → 95.83%.

## [0.1.0] — 2025-10-11 — MVP Release

### Added
- `GravitasPolicyRegistry` — on-chain Shariah compliance policy engine deployed on Arbitrum Sepolia
- `TeleportV3` — atomic V3 liquidity migration engine with EIP-712 signing and Yul-optimized gas
- `TeleportV2` — atomic V2 liquidity migration engine with cooldown and slippage protection
- TypeScript SDK (`@gravitas/sdk`) with Stripe-like developer experience
- React/TypeScript frontend deployed at gravitasprotocol.xyz
- 60-test Foundry test suite with 90%+ coverage *(66 as of 0.1.2)*
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
- ~~Redeploy hardened contracts to Arbitrum Sepolia~~ — done in 0.1.3. Arbitrum One still ahead.
- Shariah certification — in progress through AmanX Advisory (not complete)
- Multisig governance for GravitasPolicyRegistry
- Mainnet deployment on Arbitrum One
