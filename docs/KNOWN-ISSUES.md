# Known issues

What is open, why it is open, and what closing it costs. Kept here so that an
auditor, an integrator or an investor finds it in the repository rather than
discovering it themselves.

Last checked: 26 August 2026. Contracts as deployed 23 August 2026.

---

## Open, waiting on the next contract deployment

Both of these are one-line source changes. Neither is applied, for the same
reason: **any change to a contract's source changes the metadata hash appended
to its bytecode**, so the repository would stop reproducing what is on chain.

`foundry.toml` does not set `bytecode_hash`, so solc's default applies and the
metadata — which includes a hash of every source file, comments included — is
appended to the deployed bytecode. That gap between repository and chain existed
once before and was closed by redeploying. It will not be reopened to silence a
warning.

Both land together with the next deployment.

### The slippage floor is enforced on one side only

`TeleportV3.executeAtomicMigration` requires both mint minimums to exceed zero:

```solidity
require(params.amount0MinMint > 0 && params.amount1MinMint > 0, "TV3: Zero slippage not allowed");
```

There is no equivalent floor on `amount0MinDecrease` / `amount1MinDecrease`. The
new position cannot be opened on unbounded terms; the old one can be emptied on
them.

**Why it is not urgent.** Both values are covered by the owner's EIP-712
signature, so an executor cannot lower them — the owner would have to sign a
zero floor themselves. The whole migration is atomic, so a bad withdrawal cannot
be separated from the deposit that follows it. The exposure is an owner who signs
an intent that accepts any amount out of their own position, in a transaction
that is not otherwise adversarial.

**What it costs to close.** A require of the same shape as the one above.

### One compiler warning

```
Warning (5667): Unused function parameter.
  --> contracts/GravitasPolicyRegistry.sol:157
```

`checkSubscriptionCompliance(address subscriber, address subscriptionToken)`
does not read `subscriber`; it is reserved for per-investor policy. Removing the
parameter would change the function selector and break every caller, so the fix
is to leave the type and drop the name — which also means editing the NatSpec
that documents it, and therefore the metadata hash.

Everything else builds clean. As of this commit the test suites carry no
warnings at all.

---

## Open by decision

### Ownership has not moved to the timelock

`GravitasTimelock` is deployed at
`0xbFFAd90B2607e3E5926260B640BbcD1E128680Ba` and verified. The registry owner is
still the deployer.

This is deliberate. Handing control to a 48-hour timelock during active
development means every fix waits two days. The handover happens after the
external audit and before mainnet, and `Ownable2Step` is already in place so it
cannot be completed by accident or to a wrong address.

### No asset is approved in the registry

`currentVersion` is 1, which is the constructor's own executor grant and nothing
more. No token is marked compliant, so no migration can currently succeed on
Arbitrum Sepolia.

This is not a defect. What the registry permits is a ruling, and rulings are made
by the board in Majlis. The chain is waiting on people, correctly.

### TeleportV2 has nothing to route through

Arbitrum Sepolia hosts no Uniswap V2 deployment. The contract is live and
verified and its tests pass against mocks, but the constant-product path cannot
be exercised on this network. It is stated on the documentation page rather than
left for an integrator to discover.

---

## Closed, but worth knowing about

### Branch coverage figures from `forge coverage` are not meaningful here

Coverage requires `--ir-minimum` because TeleportV2 otherwise fails with
stack-too-deep, and under that flag Foundry's branch instrumentation records
nothing:

```
DA:69,33        line 69 executed 33 times
BRDA:69,2,0,0   both of its branches: zero hits
```

An earlier version of this repository's review reported ~21% branch coverage and
called it the main remaining weakness. That number measured the tool. Line counts
are reliable, and every guard in the three contracts is exercised from both
sides — confirmed by reading the guards out of the source and deciding each from
line execution counts, then checking the remainder against the tests asserting
their exact revert strings.

Line coverage is 94.4% across the three contracts. 86 tests pass.

---

## The Majlis deployment

`render.yaml` describes the service `apps/majlis` should run as. Two of the gaps
recorded here on 24 August are closed; the rest stand by decision.

Checked 26 August 2026 against the running service.

### Configured, after costing a failed deploy

`MAJLIS_MEMBERS` and `MAJLIS_DB` are both set.

Neither was, and `MAJLIS_MEMBERS` being unset was the single most expensive
thing in this project to discover: without it every credential authenticates as
an observer, so every control is hidden because none would be permitted, and the
application looks broken while working exactly as configured. **The server now
says so at boot** rather than leaving it to be found:

```
MAJLIS_MEMBERS is not set: everyone authenticates as an observer, so no one can
deliberate, vote or object. Generate a board with: npm run members -w server
```

The shared `BASIC_AUTH` credential still authenticates after members are
configured — as an observer, because it cannot say who is at the keyboard and a
vote that cannot be attributed is not a record of anything. Signing in with it
looks identical to the misconfigured state. **Sign in as a member.**

`MAJLIS_DB` took a failed deploy to get right. It was set to
`/var/majlis/majlis.json`, the value this blueprint carried, which only works with
a disk mounted there. None is, the process is not root, and the server died at
boot on `mkdir`. The blueprint now names a path the process can create, and
`StorePathError` explains that failure instead of printing a filesystem stack.

**A dashboard environment variable overrides `render.yaml`.** Fixing the file
changes nothing on a running service.

### Still on the free plan

`render.yaml` says `plan: starter`, with a note explaining why: cold starts make
a poor first impression. The service is on **free**, which spins down after
inactivity and can take **50 seconds or more** to answer the first request.

This is not theoretical. `recordSince` has been observed moving without any
deploy between the two readings — the instance had spun down and come back, and
the record started again from the seed.

Anyone opening `majlis.gravitasprotocol.xyz` cold waits through that with no
indication anything is happening.

### No disk is mounted

A decision, not an oversight: a mounted volume is a paid change and the
demonstration does not need one. What it does need is for the reset not to be
silent, and that is handled — the record carries the date it began, `/api/health`
reports it as `recordSince`, and the Record page states that storage is not
durable and that anything worth keeping should be exported.

### Checking any of this

The boot log answers all of it in three lines:

```
Gravitas Majlis — Stage Two, the board decides here — listening on :10000
Record: /tmp/majlis.json
Board: 7 member credentials configured.
```

**A failed Render deploy leaves the previous build serving.** `/api/health`
answers 200 throughout, so health being up is not evidence that a deploy worked.

### Stage Two itself

Complete, in the server and in the browser, verified rather than assumed: a
matter raised, deliberated, put to a vote, carried at threshold, moved into a
48-hour timelock, and halted by a single signatory's objection — and, since 24
August, returned from an open vote to deliberation with every position cast on it
released. Every refusal along the way behaves as the rules require.
