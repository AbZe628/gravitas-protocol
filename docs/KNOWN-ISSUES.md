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

### The engines are single-step `Ownable`, and their pause obeys the timelock

The registry is `Ownable2Step`. TeleportV2 and TeleportV3 are plain `Ownable`, so
a transfer to a wrong address is final with no acceptance step to catch it.

Worse for governance: `pause()` on both engines is `onlyOwner`. Once the timelock
owns them — which is the whole point of the handover — pausing waits out the
delay, and an emergency stop that takes 48 hours is not an emergency stop. There
is no guardian role that can halt without the delay.

`script/TransferOwnershipToTimelock.s.sol` now covers the engines as well as the
registry, so the handover is at least complete and scripted. The contract change
is two things: `Ownable2Step` on both engines, and a pauser role separate from
the owner.

**Until then the handover is a real decision, not a formality.** Moving the
engines buys governance and costs the fast stop.

### The web lockfile is not usable on Linux, so production builds unpinned

`apps/web/package-lock.json` was last written on Windows. On Linux, dependency
resolution reaches three packages the lockfile does not contain —
`@base-org/account`, `brotli-wasm` and `clsx` — so `npm ci` refuses to start and
the deploy fails.

Regenerating the lockfile on Windows does not add them: `brotli-wasm` is
referenced by nothing there at all. It needs to be regenerated **on Linux**, or
in a container, and committed from there.

Until then `.github/workflows/deploy-frontend.yml` runs `npm install`, which
means **the frontend that reaches production is built from a dependency graph
nothing pins**. CI itself runs `npm ci` and passes, because it installs the
workspaces that are in sync.

Related and worth doing at the same time: the deploy runs on **Node 20** while
`@wallet-standard/base` requires Node 22 or newer, which shows as an
`EBADENGINE` warning on every build. The README already tells contributors to
use Node 22.

### Stray ERC-721s cannot be recovered

TeleportV3 implements `onERC721Received` and accepts any ERC-721 sent to it.
There is no rescue function of any kind, so a position transferred directly
rather than through `executeAtomicMigration` is held permanently.

TeleportV2 has `rescueTokens` for ERC-20s. TeleportV3 has no equivalent for
either kind.

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

The same is true of TeleportV2 and TeleportV3, and that matters more than it
looks: their `onlyAuthorized` modifier short-circuits on `msg.sender == owner()`,
so the deployer's key can execute migrations without the registry having any say.
Handing over the registry alone would leave the governance claim reading as
satisfied while the engines still answered to one key.

This is deliberate. Handing control to a 48-hour timelock during active
development means every fix waits two days. The handover happens after the
external audit and before mainnet. `Ownable2Step` protects the registry from a
transfer to a wrong address; the engines have no such protection, which is in the
deployment queue above.

`contracts/governance/MultisigSetup.md` claimed "Ownable2Step + Timelock
eliminates single private key risk". That was true of the registry and false of
the engines, and it has been corrected.

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

---

## What an outside reading of the repository found — 26 August 2026

Someone unpacked the repository, installed Foundry and the submodules, and ran
everything rather than reading it. Most of what they found was true. It is
recorded here because the pattern matters more than the individual items:
**almost every finding was a document claiming something the code did not do.**

### Fixed

- **The service fee does not exist.** README, INVESTOR.md and the whitepaper all
  stated a fee of 5 to 10 basis points — the whitepaper twice, in the present
  tense. There is no fee anywhere in TeleportV2 or TeleportV3: no rate, no
  recipient, no line that takes anything. All four now say the model is intended
  and not implemented. **Whether to implement it is a decision, not a bug**, and
  it belongs in the deployment queue if the answer is yes.
- **Test counts disagreed in four places.** README said 66, INVESTOR.md said 46
  in one paragraph and 86 in another, and `test_output.txt` — committed, dated 22
  August — said 60. The number is 86. The stale artefacts are deleted.
- **`docs/DEPLOYMENTS.md` documented a signer that could not work.** It gave the
  EIP-712 domain name as `TeleportV3`; the contract uses `GravitasTeleportV3`.
  Anyone building a signer from that document produces signatures that revert
  with no way to see why. It also gave solc 0.8.20 for a 0.8.24 build, a 3600s
  cooldown for a 900s one, 10000 bps for 2000, and two deploy scripts that were
  never written.
- **`proof-of-quality/security_scan.txt` read as a tool report.** Its title said
  "Simulated" and its last line said "RESULT: 0 High, 0 Medium, 0 Low
  vulnerabilities detected." No static analysis runs in CI. It now says what it
  is in its first paragraph, and that running Slither is the obvious next step.
- **The frontend deployed from an unpinned dependency graph.** CI ran `npm ci`
  and the deploy workflow ran `npm install`, so the one build that reached
  production was the one that did not install from the lockfile. Both use
  `npm ci` now.
- **`UniV2Adapter.sol` had no access control** on either liquidity function,
  each taking a recipient from the caller. Dead — nothing imported it, nothing
  deployed it — and deleted.
- **The README's Quick Start could not be run.** It described `pnpm` workspaces;
  there is no `pnpm-workspace.yaml` and no root package. It also failed to say
  that OpenZeppelin and forge-std are submodules, so a source archive downloaded
  from GitHub cannot build the contracts at all.
- **Majlis authenticated without counting attempts.** Every attempt derives a
  scrypt hash, deliberately including for member ids that do not exist — which
  is what keeps "no such member" and "wrong password" indistinguishable. Nothing
  counted them, so a loop of wrong passwords was a way to spend this single
  instance's CPU until the board could not use it. Failed attempts are now
  throttled per address, ahead of the credential check, with a success clearing
  the record. Seven tests hold it.
- **`cors()` was open to every origin.** The interface is served by this same
  process, so nothing legitimate needs it. Cross-origin is refused unless
  `MAJLIS_ORIGINS` names somewhere, and the response headers that matter for a
  page read by people are set.
- **The SDK's `validateTokens` bypassed `gatedRead`**, in a class documented as
  always using it — so a paused registry reached the caller as a raw viem error
  rather than the named refusal. It is the check a migration actually runs,
  which made it the worst one to miss.
- **Dead references.** `DEPLOY.md` was cited by the README and by
  `basicAuth.ts` and has never existed. `apps/majlis/.env.example` said the
  assistant endpoint is unauthenticated; it is not.

### Did not hold up

**This was recorded here as not holding up, and that was wrong.** The claim was
that `npm ci` does not fail, on the strength of `npm ci --dry-run` passing and of
`brotli-wasm` appearing nowhere in the lockfile or `node_modules`.

Changing the deploy to `npm ci` proved otherwise within sixteen seconds:

```
npm error Missing: @base-org/account@2.5.10 from lock file
npm error Missing: brotli-wasm@3.0.1 from lock file
npm error Missing: clsx@1.2.1 from lock file
```

Exactly the three packages reported. The dry run passed because `node_modules`
was already populated and npm short-circuited; the local toolchain is npm 11 on
Node 24 while CI is npm 10 on Node 20; and the resolution differs by platform.
**A check that passes without exercising the thing it claims to check is worth
less than no check**, and this is the second time that pattern has appeared in
this repository.

See the open item below.

Their coverage figures also differ from ours (they report 96.25% overall against
our 94.4%, and 97.7% for TeleportV2 against our 90.7%). Coverage here depends on
`--ir-minimum`; see the branch-coverage note above before trusting either.

### Still open

Seven production dependency vulnerabilities, six moderate and one high, all
reached through the wallet SDKs. `npm audit fix` does not clear them without
changing major versions of dependencies the wallet connectors pull in.
