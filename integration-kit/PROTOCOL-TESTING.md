# Protocol Testing & Architecture — Institutional Reviewer Guide

This document is written so an integrating engineering team (CTO / core devs) can
understand, verify, and test the Gravitas Protocol **end-to-end without a call**. It
covers the trust and custody model, the exact roles (who signs, who executes, what
Gravitas controls), the settlement flow step by step, the security properties to
check, and how to reproduce each of them yourself.

> Status: **testnet**. All contracts are source-verified on Arbitrum Sepolia.
> LOIs and Shariah certification are in progress (not represented as complete).
> Nothing is deployed to mainnet; commercial/production use is licensed separately
> (see repository `LICENSE`, BUSL-1.1).

---

## 1. Two integration surfaces

Gravitas exposes two independent surfaces. An institution can adopt either or both.

| Surface | What it is | How you test it |
|---|---|---|
| **A. Compliance gate** | Pre-execution Shariah policy decision (`ALLOW`/`DENY`) before any value moves. On-chain source of truth is `GravitasPolicyRegistry`; an off-chain Compliance API mirrors it for orchestration. | `mock-server/` + `sdk-examples/verify-client.ts` (six PoC scenarios) and `sdk-examples/onchain-read.ts` (trustless on-chain read). See `README.md`. |
| **B. Atomic settlement engine** | `TeleportV3` — non-custodial, atomic migration/settlement of Uniswap V3 liquidity positions with owner-signed intents and controlled failure. | This document (§4–§6): read the verified contract, sign an intent with the SDK, simulate, and optionally run a full testnet execution. |

Surface A answers *"is this asset/transaction Shariah-permitted?"*. Surface B answers
*"execute this settlement atomically, only if compliant, without anyone being able to
alter the terms."*

---

## 2. Trust & custody model (who controls what)

This section answers the questions institutional integrators ask first.

**Gravitas is non-custodial.** The protocol never holds user funds or private keys at
rest. `TeleportV3` holds token balances only *within* a single atomic transaction and
returns everything (new position + any dust) to the position owner before the
transaction completes. If any step fails, the whole transaction reverts and nothing
moves.

**Three roles:**

| Role | Who it is | What they can do | What they cannot do |
|---|---|---|---|
| **Position owner** | The end client / institution that owns the liquidity position (NFT). | Authorizes the migration by signing an EIP-712 intent with their own wallet, and approving `TeleportV3` as operator for the specific position. | — |
| **Executor** | An authorized backend that submits the transaction (e.g. the institution's own signer / MPC service, whitelisted by Gravitas governance in the registry). | Submit `executeAtomicMigration(params, signature)` on behalf of the owner. Pays gas. | **Cannot alter any economic term.** The owner's signature binds every parameter (slippage floors, swap config, ticks, deadline, nonce). A tampered parameter fails signature verification and reverts. Cannot move funds anywhere other than back to the owner. |
| **Governance** | The registry owner — recommended: a `GravitasTimelock` (TimelockController) backed by a Gnosis Safe multisig (e.g. 3-of-5), 48-hour delay. | Maintain the compliance whitelist (assets/routers/executors); trigger the system-wide compliance pause (kill switch). | Cannot spend user funds; cannot forge an owner intent. |

**Mapping to a wallet-infrastructure partner (e.g. an MPC wallet provider):** the
partner supplies the wallet, signing, and transaction-execution layer; Gravitas
supplies the compliance policy (Surface A) and the atomic, deterministic settlement
logic (Surface B). In that arrangement the partner's signer is onboarded as an
*executor*; the *position owner* still produces the signed intent; and `TeleportV3`
independently enforces both compliance and atomicity. Neither side can unilaterally
move the owner's funds.

---

## 3. What Gravitas explicitly does NOT do

Scope clarity avoids wasted review cycles:

- It does **not** custody funds or hold private keys.
- It does **not** replace your wallet, signing, or key-management layer.
- It does **not** make market/price decisions or provide yield. Any rebalancing swap
  is a single, owner-bounded step (`swapAmountOutMin` is signed by the owner).
- It does **not** issue "certified compliant" claims on assets it has not been
  configured for; the registry whitelist is explicit and governance-controlled.

---

## 4. The settlement flow (`TeleportV3`), step by step

`executeAtomicMigration(AtomicMigrationParams params, bytes signature)` performs, in a
single atomic transaction:

1. **Validation** — deadline not expired; fee tier and tick spacing valid; mint
   slippage floors non-zero.
2. **Intent verification** — recovers the EIP-712 signer and requires it to equal the
   position owner. The signed struct binds **all 15 fields** (tokenId, fee, ticks, all
   four slippage bounds, deadline, the full swap config, and the per-owner nonce).
3. **Compliance check** — `registry.verifyAssetCompliance(token0)` **and** `token1`
   must both pass. If the registry is paused, this reverts (system-wide halt).
4. **Execution** — pull the position NFT (owner must have approved the contract),
   decrease liquidity, collect, burn the old NFT; optionally perform one rebalancing
   swap bounded by the signed `swapAmountOutMin`; mint the new position **to the
   owner**.
5. **Dust return** — any residual token balances are returned to the owner.
6. **Atomicity** — any failure at any step reverts the entire transaction. No partial
   fills, no funds stranded in the contract.

Replay protection: each owner has a monotonic `nonce` (read `nonces(owner)`); a
signature is valid for exactly one execution.

---

## 5. Security properties to verify (and how)

These are the properties an auditor should confirm. Each maps to a test in the public
Foundry suite (`test/`), runnable with `forge test`.

| Property | Why it matters | Where it's proven |
|---|---|---|
| **Economic-parameter binding** | An authorized executor cannot take a valid owner signature and re-run it with weakened economics (e.g. `swapAmountOutMin = 0`). | `test_V3_SignatureBindsSwapMinOut`, `test_V3_SignatureBindsMintSlippage`, `test_V3_ModifiedParams` |
| **System-wide compliance kill switch** | Pausing the registry fails *every* integrator closed (Surface A and B), not open. | `test_Registry_VerifyFunctionsRevertWhenPaused`, `test_Registry_PauseHaltsExecutorAuthorizationSystemWide` |
| **Owner is never locked out by a pause** | Governance can halt the system without bricking the protocol owner at the auth gate. | `test_Registry_OwnerNotLockedOutOfAuthGateByRegistryPause` |
| **Non-custodial / atomicity** | Funds return to the owner; the contract holds zero at rest; failures revert atomically. | `test_V3_FullMigration_NoSwap`, `test_V3_DustRefund_*`, invariant suite |
| **Replay protection** | A signature cannot be reused. | `test_V3_NonceReplayProtection` |
| **Access control & governance** | Only whitelisted executors (or the owner) can execute; ownership transfer is two-step; timelock + multisig recommended for production. | `test_V3_NonAuthorized`, `GravitasPolicyRegistryMultisig.t.sol` |

Full suite (66 tests) results are captured in `../proof-of-quality/test_results.txt`.

---

## 6. How to test it yourself

### 6.1 Compliance gate (5–10 minutes, no keys)
Follow `README.md`: run the mock sandbox, execute the six PoC scenarios
(`npm run verify` → 6/6), and cross-check the on-chain registry
(`npm run onchain`). Every API decision is reproducible against the verified
`GravitasPolicyRegistry`.

### 6.2 Read the settlement engine on-chain (no keys)
Open `TeleportV3` on the explorer (source-verified) and inspect
`executeAtomicMigration`, the `AtomicMigrationParams` struct, `nonces`, and the
`registry` reference. Confirm the compliance check and the owner-signature check are
in the execution path. The `onchain-read.ts` pattern (Sourcify → Etherscan fallback)
works for `TeleportV3` as well — point it at the TeleportV3 address.

### 6.3 Build and simulate a migration intent (SDK, no funds needed)
The SDK produces the exact EIP-712 payload the contract verifies — do **not**
hand-roll a reduced field set:

```ts
import { buildMigrationTypedData } from "gravitas-sdk"; // ./eip712

// 1. Read the owner's current nonce from TeleportV3.nonces(owner).
// 2. Build the typed data (binds ALL execution parameters):
const typedData = buildMigrationTypedData(params, nonce, teleportV3Address, 421614);
// 3. Sign with the owner's wallet:
const signature = await walletClient.signTypedData({ account: owner, ...typedData });
// 4. Dry-run before submitting (validates compliance + parameters):
await client.migration()./* …builder… */.simulate(executor, signature);
```

`simulate()` runs the full pre-flight (position lookup, compliance validation,
transaction simulation) and surfaces a `ShariahViolationError` if either token is not
whitelisted — all without submitting a transaction.

### 6.4 Full end-to-end execution on testnet
A complete on-chain run requires (a) a Uniswap V3 position on Arbitrum Sepolia owned by
your test wallet, (b) `TeleportV3` approved as operator for that position, and (c) an
executor slot in the registry. Executor onboarding and a hosted sandbox key are
provided under **Phase 0 (NDA)** of the partnership. With those in place, the flow is
exactly §4; the SDK's `encodeCalldata()` returns raw calldata for submission via your
own signer/multisig.

---

## 7. Verify the chain, not the claims

| Contract | Network | Address |
|---|---|---|
| GravitasPolicyRegistry | Arbitrum Sepolia | `0xbcaE3069362B0f0b80f44139052f159456C84679` |
| TeleportV3 | Arbitrum Sepolia | `0x5D423f8d01539B92D3f3953b91682D9884D1E993` |

> **Redeployment note:** these addresses point to the pre-`0.1.2` bytecode. The
> contracts are being redeployed to Arbitrum Sepolia with the `0.1.2` security
> hardening; the addresses will be updated here and in the root `README.md` once the
> new source-verified deployment is live. Re-verify the addresses before an integration
> run.

Both contracts are source-verified — inspect them directly rather than trusting any
Gravitas-hosted endpoint.

---

**Questions:** in writing (email / issues), answered within 24–48h with references to
code and documentation. Contact: abdusamed@gravitasprotocol.xyz · https://gravitasprotocol.xyz
