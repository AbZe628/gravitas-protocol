# Gravitas Protocol — Whitepaper

**Version:** 1.1.0
**Status:** Testnet, pre-audit
**Last updated:** August 2026
**Network:** Arbitrum Sepolia (chain ID 421614)

> This document describes what exists. Where something is planned rather than built, it says so.
> Where the deployed code and this repository disagree, section 3.3 says exactly how.

---

## Executive summary

### The problem

A Shariah board approves an asset and records its decision. The transaction then runs through
software that has never read that decision. Between the two sits a gap that review cannot close,
because review happens before and the transaction happens anyway.

Around that central problem sit the ordinary frictions of moving liquidity:

- **Manual migration.** Withdrawing from one pool and entering another is several transactions,
  each with its own failure mode and its own window for the position to sit exposed.
- **Custody exposure between steps.** Any process that holds assets between withdrawal and
  redeposit introduces a state in which someone other than the owner controls them.
- **Uncertain outcomes.** Multi-step migrations settle at whatever the market gives, which is
  precisely the uncertainty Islamic finance treats as gharar.
- **Compliance as documentation.** Where a compliance layer exists at all it is a report written
  afterwards rather than a condition of execution.

### What Gravitas does

Gravitas is non-custodial infrastructure that makes an approved Shariah ruling a condition of
execution.

- **Atomic migration.** A Uniswap V2 or V3 position is moved in one transaction. It completes
  whole or it does not happen.
- **A registry the contract must ask.** Both tokens are checked against an on-chain whitelist
  before anything moves. The check is mandatory and cannot be routed around.
- **Signed intent.** The owner signs the exact terms with EIP-712 typed data, and a per-owner
  nonce ties the signature to one execution.
- **Bounded outcome.** The result must meet the minimums the owner signed, or the whole
  transaction reverts.
- **A place where the rule is decided.** Majlis is the environment in which a Shariah board reads
  a matter, sees what a proposed rule would have done to real past activity, and records its
  decision against the rules the protocol enforces. See section 6.

### Revenue

A service fee of 5 to 10 basis points is intended, charged once on a completed migration. It is not
implemented: no fee is taken anywhere in the contracts as they stand, and the figures here describe
a designed model rather than a shipped one. It would not
accrue with time, and the protocol lends nothing. No revenue has been realised to date; the
protocol has never run on mainnet.

---

## 1. Core architecture

### 1.1 System components

Three contracts and one client library.

#### GravitasPolicyRegistry

- Holds the whitelist of assets a supervising Shariah board has approved.
- Holds the authorised router set and executor status.
- Exposes the verification functions the Teleport engines call before execution.
- Emits an event for every compliance decision, so the state can be reconstructed by anyone.
- Carries an on-chain version so a reader can tell which registry answered.
- Uses `Ownable2Step`, so ownership moves only when the incoming owner accepts it.
- **Today the owner is a single externally owned account.** `GravitasTimelock` is written and
  its handover is tested, but no timelock address is deployed yet. See section 4.

#### TeleportV2.sol

- Migrates Uniswap V2 LP positions.
- Enforces `maxMoveBps`, which limits the share of a pool that can be moved in one transaction.
- Enforces `cooldownSeconds` per liquidity path, so the same path cannot be migrated repeatedly
  in quick succession.
- **Not deployed to testnet.** The source is in this repository and the address is unassigned.

#### TeleportV3.sol

- Migrates Uniswap V3 concentrated liquidity positions.
- EIP-712 typed data signing with per-owner nonces.
- Optional rebalancing swap through an authorised router, only when the signed intent asks for it.
- Yul-optimised dust refund, measured at roughly 2,000 gas saved per transaction.
- Deployed and verified on Arbitrum Sepolia. See section 3.3 for the version caveat.

#### @gravitas/sdk

A TypeScript client built on viem with runtime validation through zod. Its distinguishing
behaviour is that it queries the registry **before** it simulates anything, so a non-compliant
asset throws `ShariahViolationError` in the caller's own process rather than reverting on chain
and costing gas. See `gravitas-sdk/` and `docs/INTEGRATION.md`.

### 1.2 The V3 migration flow

`executeAtomicMigration` runs seven steps inside one transaction. If any step fails, every step
before it is undone.

1. **Pre-check.** Ownership of the position, compliance of both tokens, and the deadline.
2. **Decrease.** Liquidity is withdrawn from the existing position.
3. **Collect.** Underlying tokens and accrued fees move to the engine.
4. **Burn.** The old position NFT is destroyed and the state is left clean.
5. **Swap.** Optional rebalancing through an authorised router.
6. **Mint.** The new position is minted directly to the owner's address.
7. **Refund.** Remaining dust is returned by `_refundDustOptimized`.

At no point does the protocol hold a position it can fail to return. There is no custody step.

### 1.3 Security model

| Property | Mechanism |
| :--- | :--- |
| Replay protection | EIP-712 domain separator plus a per-owner on-chain nonce |
| Pool destabilisation | `maxMoveBps` ceiling on the share of a pool moved per transaction |
| Repeated extraction | `cooldownSeconds` per liquidity path |
| Slippage | Owner-signed minimums on every leg, enforced on chain |
| Expiry | Deadline carried in the signed intent |
| Non-compliant routing | Mandatory registry check on both tokens before execution |

---

## 2. Technical specification

### 2.1 Core invariants

Stated formally, with their proofs of mitigation, in `docs/TECHNICAL_SPEC.md`.

**Invariant 1, non-custodial asset integrity.** The underlying tokens the owner holds are the
same before and after, less only slippage and the protocol fee.

```
balance_start = balance_end + fees + slippage
```

Mitigated by executing burn, collect, swap and mint atomically, and by `_refundDustOptimized`
returning any residue inside the same transaction that created it.

**Invariant 2, compliance as a condition.** A migration executes only if both tokens are
registered compliant.

```
isCompliant(tokenA) AND isCompliant(tokenB) must be true
```

Mitigated by a mandatory `registry.verifyAssetCompliance` call at the head of the execution path
in both engines. A failing pair produces a custom error and a reverted transaction, not a warning.

**Invariant 3, deterministic outcome.** The result must meet or exceed the minimums the owner
signed, or the entire transaction reverts.

```
minted >= minimum signed, and out_A >= min_A, and out_B >= min_B
```

Mitigated by the `amountAMin`, `amountBMin` and `amountOutSwapMin` parameters carried in the
signed intent. This is what removes gharar from the execution: the owner knows the bound before
the transaction runs, and nothing settles at a number nobody agreed to.

### 2.2 Test coverage

| Component | Coverage | Tests | Status |
| :--- | :--- | :--- | :--- |
| GravitasPolicyRegistry | 90% | 15 | Passing |
| TeleportV2 | 90.7% | 21 | Passing |
| TeleportV3 | 90% | 19 | Passing |
| **Contracts total** | **90.2%** | **60** | **Passing** |
| Majlis, server and client | — | 69 | Passing |

Invariant and fuzz testing runs through Foundry. Coverage is a measure of which lines were
executed, not a proof of correctness, and undiscovered defects remain possible.

### 2.3 Gas

| Operation | Gas | Note |
| :--- | :--- | :--- |
| V2 migration | about 180,000 | Custom errors save roughly 2,000 |
| V3 migration | about 220,000 | Yul dust refund saves roughly 2,000 |
| Compliance check | about 8,000 | Read against the registry |

Figures are from the gas snapshot in this repository and are testnet measurements.

---

## 3. Deployment status

### 3.1 Arbitrum Sepolia

All dashboard figures in the application are simulated. Nothing here is a mainnet deployment.

| Contract | Address | Status |
| :--- | :--- | :--- |
| GravitasPolicyRegistry | `0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23` | Deployed and verified |
| TeleportV3 | `0x6702C2CE6eD58ca3934eBBd785CaC1De8DCd85B4` | Deployed and verified |
| TeleportV2 | not assigned | Not deployed |

Explorer links are in `docs/DEPLOYMENTS.md`.

### 3.2 Mainnet readiness

| Item | State |
| :--- | :--- |
| Internal security review | Complete, published at `proof-of-quality/INTERNAL_REVIEW.md` |
| Contract test coverage at or above 90 percent | Complete |
| Frontend exercised on Arbitrum Sepolia | Complete |
| Redeploy of the 0.1.2 hardening | **Not done.** See 3.3 |
| Independent external security audit | **Not commissioned.** Funded by a round that has not closed |
| Shariah certification | **Not complete.** In progress through AmanX Advisory, no date claimed |
| Multi-signature and timelock governance | Contracts written, handover tested, **not deployed**. See 4.2 |
| Mainnet deployment | Not started |

### 3.3 What the redeployment of 23 August 2026 closed

Until that date the bytecode on chain was a generation behind this repository, and the gap was
wider than earlier versions of this document described. The deployed contracts carried **no pause
mechanism at all**, no two-step ownership transfer, no policy version history, and no EIP-712
signed intent — not weakened versions of those things, but no versions of them. TeleportV3's swap
router pointed at `0xE592427A0AEce92De3Edee1F18E0157C05861564`, an address holding no code on
Arbitrum Sepolia, so the rebalancing swap could not have executed at all.

All four contracts were redeployed and verified on Arbiscan. Three further faults were corrected
before deploying rather than after, because deploying any of them would have committed the fault
and required a second deployment:

1. **The policy hash did not commit to the policy.** It hashed the block timestamp, the sender and
   the version number — metadata about the write, carrying nothing derived from the whitelist. Two
   entirely different registries produced the same hash when written in the same block by the same
   owner at the same version. Since the claim made throughout this document is that "was what the
   board approved the same as what was deployed" reduces to comparing hashes, the one value that
   comparison rests on could not support it. Each change is now folded into the hash before it and
   tagged with which register it touched, so `policyHistory[v]` commits to the ordered sequence
   that produced version v and can be replayed from events and independently recomputed.
2. **The dust refund dropped the ERC-20 return value.** Hand-written assembly checked only whether
   the call reverted. Against a token that reports failure by returning false, the leftover balance
   stayed in the contract while the migration reported success. It now uses `SafeERC20`.
3. **Approvals were not reset** after the position manager and the swap router had been used.

The superseded addresses still resolve on chain and must not be integrated against. They are
listed in `docs/DEPLOYMENTS.md`.

What this section does **not** claim: the contracts have not been independently audited, and
ownership of the registry has not yet moved to the timelock. Both are covered in section 4.

---

## 4. Governance

### 4.1 Today

The PolicyRegistry owner is a single externally owned account. That is fast, it is appropriate for
a testnet, and it is not good enough for mainnet.

### 4.2 The governance chain, written and tested

```
Gnosis Safe (3 of 5) → GravitasTimelock (48 hours) → GravitasPolicyRegistry
```

Every policy change, meaning the asset whitelist, router authorisation or executor status, must:

1. be proposed by a Safe signer and approved by three of five,
2. wait out a 48 hour delay in public,
3. then be executed, by anyone at all.

**This is written code, not a diagram.** The pieces already in this repository:

| Piece | Location | State |
| :--- | :--- | :--- |
| `GravitasTimelock` | `contracts/governance/GravitasTimelock.sol` | Written. An OpenZeppelin `TimelockController` with the production configuration documented on the contract itself |
| Ownership handover script | `script/TransferOwnershipToTimelock.s.sol` | Written |
| Two-step ownership | `GravitasPolicyRegistry` uses `Ownable2Step` | Implemented |
| Handover tests | `test/GravitasPolicyRegistryMultisig.t.sol` | Passing. They assert that a transfer requires acceptance, that an attacker cannot accept it, and that only the owner can propose one |
| Deployment procedure | `contracts/governance/MultisigSetup.md` | Written, with a 300 second delay documented for testnet rehearsal |

Constructor configuration for production: `minDelay` 172800 seconds, proposers set to the Safe,
executors set to `address(0)` so anyone may execute once the delay has run, and `admin` set to
`address(0)` so the timelock has no privileged party at all.

| Role | Authority | Threshold |
| :--- | :--- | :--- |
| Treasury | Fee parameters, policy changes | 3 of 5, then 48 hours |
| Guardian | Emergency pause, and nothing else | 1 of 1 |
| Community | Voting, after mainnet | Not designed yet |

**What remains is deployment, not development.** Three steps: create the Safe, deploy the
timelock with the constructor arguments above, and run the ownership transfer and acceptance. No
timelock address appears in `docs/DEPLOYMENTS.md`, so until it does, the registry owner remains a
single externally owned account.

### 4.3 The asymmetry between permitting and restricting

A delay protects when a change permits something, because the risk grows with everything done
under it. The same delay is a hazard in the other direction: two days of continued activity on an
asset discovered to be non-compliant is not caution, it is harm.

Majlis therefore models restriction as immediate, with a lower threshold, subject to ratification
by the full board within a defined window or it lapses. The constants are in
`apps/majlis/server/src/types.ts`.

### 4.4 Risk register

| Risk | Mitigation | State |
| :--- | :--- | :--- |
| Contract defects | Internal review, 90.2 percent coverage, invariant and fuzz tests | External audit not commissioned |
| Replay | EIP-712 domain separation and per-owner nonces | Implemented, with the 0.1.2 caveat in 3.3 |
| Pool destabilisation | Cooldown and `maxMoveBps` | Implemented in TeleportV2, which is not deployed |
| Slippage and expiry | Owner-signed minimums and deadline | Implemented |
| Admin key compromise | Multi-signature and timelock | `GravitasTimelock` written and its handover tested, not yet deployed |
| Policy change without notice | 48 hour timelock | Written, not yet deployed |
| Regulatory change | The registry is governed and updatable | Implemented |

### 4.5 Incident response

The intended sequence is detection, assessment by the guardian, containment by pause,
communication, then a written post-mortem. Note that on the currently deployed registry the pause
does not gate verification, per section 3.3, so containment by pause is not yet effective. No
monitoring or alerting vendor is contracted at this time.

---

## 5. Shariah compliance

Gravitas enforces the rules a supervising board writes into the registry. It does not implement,
adhere to, or certify against any external standards body, and it does not decide what is
compliant. The categories below describe what the registry is able to express.

| Principle | How the protocol addresses it |
| :--- | :--- |
| **Riba**, interest | The intended revenue is a service fee of 5 to 10 basis points, charged once on a completed migration and not accruing with time. It is designed, not implemented — no fee is taken in the contracts today. The protocol lends nothing and pays nothing for time. |
| **Gharar**, uncertainty | Execution is atomic and the outcome is bounded by the owner's own signed minimums. A result that cannot meet them is not delivered at a worse number, it is not delivered at all. |
| **Maysir**, speculation | The registry admits only assets a board has approved. Whether a given asset qualifies is the board's judgement, not the protocol's. |
| **Asset eligibility** | The whitelist is on-chain and governed. Anyone can read its current state without asking us, and every change is an event. |

No formal Shariah certification has been obtained. Certification is in progress through AmanX
Advisory, is not complete, and no date is claimed.

---

## 6. Majlis

Making an approved ruling enforceable at the moment of execution solves one problem and creates
another: once a rule has direct operational force, the process by which it is proposed,
understood, debated and amended becomes the most sensitive part of the system.

Today that process is informal. A board discusses, a decision is minuted, someone conveys it to a
technical team, the technical team implements what it understood, and the board has no means of
confirming that what runs is what it decided. Every party acts in good faith and the gap remains.

Majlis is the environment in which that gap closes. It lives in `apps/majlis/`.

### 6.1 The governing principle

> **The vote is the signature.**

A scholar's vote is not intended to produce a recommendation that someone else then executes.
What is signed is a hash of the exact operative parameters as displayed at the moment of voting,
so the question "was what the board approved the same as what was deployed" reduces to a
comparison rather than to testimony. The canonicalisation rules are in
`apps/majlis/server/src/services/hash.ts` and are versioned, so the scheme can change without a
silent mismatch.

### 6.2 What exists today

**Stage one only.** It is read only, it carries no voting and no signing authority, and there is
deliberately no API route by which a rule can be created, amended or approved. A test asserts that
no write route exists; if a future change adds one before signing authority is in place, that test
fails, which is the intention.

| Screen | Content |
| :--- | :--- |
| Matters | A plain-language brief, the operative parameters, what is deliberately not being decided, the mechanism, the simulation, and the deliberation record |
| Rules in force | Every rule with its parameters, its hash, and a live check that the two still match |
| Briefings | A standing brief on technological change: what changed, why, which rules it touches, and a question for the board, never a conclusion |
| Assistant | Explains mechanism in ordinary language with its sources named |
| Record | Retained explanations and a one-action audit export carrying an integrity hash |

Three languages at launch, English, Arabic and Urdu, with full right-to-left support.

### 6.3 The assistant, and why it refuses

The assistant exists because the alternative, a scholar ruling on a mechanism he was given no fair
opportunity to understand, is worse than the risk it introduces. The risk is precisely the one the
whole system exists to address: a faithful ruling founded on an unfaithful explanation. A wrong
explanation does not fail loudly. It produces a confident scholar who rules correctly on a
mechanism that does not exist.

Four constraints are therefore enforced in code rather than left to the model's discretion. They
are documented in `apps/majlis/docs/ASSISTANT-RULES.md` and tested in
`apps/majlis/server/test/majlis.test.ts`.

1. **It does not give rulings.** Three gates: a lexical check before the model is called, a
   separate semantic classification that reads intent, and a lexical check on the output. All
   three fail closed. The middle gate was added after manual testing found four of five indirect
   phrasings passing a two-gate design.
2. **Every explanation carries its source.** Repository paths are extracted from the answer and
   surfaced beneath it. Where the assistant relies on general knowledge rather than something
   verified in this codebase, it is instructed to say so.
3. **Everything is retained.** If an explanation is later found to be wrong, it is possible to
   identify precisely which decisions rested on it.
4. **Uncertainty is escalated, not smoothed.** Low-confidence exchanges are flagged for referral
   to the technical liaison, who answers in writing within the record.

### 6.4 Stages

| Stage | Content | State |
| :--- | :--- | :--- |
| One | Record, briefings and the assistant. Read only | **Built** |
| Two | Matters, briefs, simulation and threaded deliberation. Votes recorded, signing outside the system | Planned |
| Three | The vote becomes the signature. Threshold signing moves into Majlis | Planned |
| Four | Multiple boards and institutions, cross-reference, published reference | Planned |

The principal risk is not technical. It is that scholars find it burdensome and do not use it, at
which point it is worth nothing regardless of its qualities. The sequence is designed to earn use
before it requires it.

### 6.5 Two caveats that must be cleared before production use

1. The Policy Registry interface used by Majlis in `apps/majlis/server/src/services/registry.ts`
   is a minimal assumed interface and **has not been verified against the deployed contract**.
   Every chain read is best-effort, a failure is reported as a failure rather than disguised, and
   no unverified read is presented as confirmed.
2. The Arabic and Urdu strings are a working baseline and **must be reviewed by a native speaker
   with subject knowledge**. Terminology in Islamic finance is precise, and a plausible
   translation is not a correct one.

All content in `apps/majlis/server/src/data/seed.ts` is fabricated demonstration data and
represents no real scholar, board or institution.

---

## 7. Integration

| Resource | Location |
| :--- | :--- |
| SDK source and reference | `gravitas-sdk/` |
| Integration guide | `docs/INTEGRATION.md` |
| Integration kit: OpenAPI description, mock server, sandbox policies, test scenarios | `integration-kit/` |
| Technical specification | `docs/TECHNICAL_SPEC.md` |
| Internal security review | `proof-of-quality/INTERNAL_REVIEW.md` |

Typed errors returned by the SDK map one to one onto contract revert conditions:
`AssetNotCompliant`, `CooldownNotMet`, `InvalidSignature`, `DeadlineExpired`, `SlippageExceeded`.

The integration kit exists so that an institution can run a proof of concept against a mock server
and a sandbox policy set without touching a chain at all.

---

## 8. Business model

### 8.1 Fees

| Fee | Rate | Recipient |
| :--- | :--- | :--- |
| Protocol fee | 5 to 10 bps on a completed migration | Treasury |
| Referral fee | 1 to 2 bps, optional | Partner |

Charged once, on completion, and not accruing with time.

### 8.2 Planning assumptions, not forecasts

The figures below are internal planning assumptions used for budgeting. They are not projections,
they are not based on observed usage, and **no revenue has been realised to date**.

| Period | Assumed monthly volume | Implied monthly fee revenue |
| :--- | :--- | :--- |
| Year 1 | 10M to 50M USD | 5K to 50K USD |
| Year 2 | 100M to 500M USD | 50K to 500K USD |
| Year 3 | 1B USD and above | 500K USD and above |

Anyone using these numbers for anything other than internal budgeting should treat them as
unvalidated.

### 8.3 Treasury allocation

Development 40 percent, security including audits and bug bounties 30 percent, market development
20 percent, community 10 percent.

---

## 9. Roadmap

Milestones are committed only when the preceding one is complete. No timeline is committed until
the audit is done.

| Phase | Content | State |
| :--- | :--- | :--- |
| Done | Core contracts and frontend on testnet, 90.2 percent coverage, Majlis stage one | Complete |
| Next | Redeploy the 0.1.2 hardening to testnet | Not started |
| Next | Independent external security audit, findings addressed and published | Conditional on the funding round closing |
| Next | Shariah certification | In progress through AmanX Advisory, no date claimed |
| Next | Deploy the Safe and the timelock, and hand the registry over | Contracts ready, not executed |
| After audit and certification | Mainnet on Arbitrum One with conservative TVL caps | Conditional |
| Later | Optimism and Polygon, cross-chain compliance registry | Planned |
| Later | Majlis stages two and three, DAO governance | Planned |

---

## 10. Limitations

Stated plainly, in one place.

1. **Testnet only.** No mainnet deployment has occurred. Dashboard figures are simulated.
2. **No external audit.** An internal review exists. A third-party audit has not been
   commissioned.
3. **No Shariah certification.** In progress, not complete, no date claimed.
4. **The deployed bytecode predates two security fixes.** See section 3.3.
5. **TeleportV2 is not deployed**, so the cooldown and pool-stability limits are not live
   anywhere.
6. **One admin key.** `GravitasTimelock` and the ownership handover are written and tested, but
   no timelock is deployed, so the registry owner is still a single account.
7. **Majlis chain reads are best-effort** against an unverified interface, and its Arabic and
   Urdu need a native reviewer.
8. **Coverage is not correctness.** 90.2 percent of lines executed leaves room for defects.
9. **No revenue, no users, no volume.** Everything in section 8.2 is an assumption.

---

## 11. References

- Repository: https://github.com/AbZe628/gravitas-protocol
- Site: https://gravitasprotocol.xyz
- Contract explorer: https://sepolia.arbiscan.io
- EIP-712: https://eips.ethereum.org/EIPS/eip-712
- Contact: abdusamed@gravitasprotocol.xyz

---

## Legal

This protocol is in active development and deployed on testnet only. All information here is for
demonstration and educational purposes. Nothing in this document constitutes financial, legal or
religious advice, an offer, or a solicitation. Consult qualified professionals before making
investment or compliance decisions. Do not use this software with funds you are not prepared to
lose.

Licensed under BUSL-1.1. See `LICENSE`.
