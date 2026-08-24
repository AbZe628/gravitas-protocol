# Known issues

What is open, why it is open, and what closing it costs. Kept here so that an
auditor, an integrator or an investor finds it in the repository rather than
discovering it themselves.

Last checked: 24 August 2026, against the deployment of 23 August 2026.

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
