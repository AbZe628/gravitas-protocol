# 02 — Permitted pair check

## Setup

Reviewed base: `692022e1ca34a280f90a198d2455ac3535b3bce2`, branch `mb-sandbox-review`.

Use the existing `GravitasSubscriptionIntegrationTest` fixture. A fixture is the setup created for each test. `setUp()` deploys a fresh, unpaused registry and whitelists dummy asset A (`0x0000000000000000000000000000000000000100`). A whitelist is an explicit list of allowed addresses. The constructor grants the owner executor status at policy version 1; asset A is added at version 2; the fixture's executor is added at version 3. Executor status is not checked by either function in this scenario.

All addresses are dummy. These tests use address entries, not deployed token contracts or token balances.

## Steps

1. In `test_VerifyAssetCompliance`, read `verifyAssetCompliance(A)` and read it for dummy unlisted address `0x000000000000000000000000000000000000dead`.
2. In `test_AreTokensCompliant`, the owner whitelists dummy asset B (`0x0000000000000000000000000000000000000101`). This adds policy version 4 in that test's fresh fixture.
3. Read `areTokensCompliant(A, B)`.
4. Read `areTokensCompliant(A, unlistedAddress)`.

## Expected result

The single-asset reads return `true` for A and `false` for the unlisted address. The pair read returns `true` when both entries are whitelisted, and `false` when one entry is not.

The contract uses `&&`, meaning both conditions must be true. Both functions are read-only: they return a Boolean (`true` or `false`) and do not move tokens or update policy.

## Existing proof commands

Run from the repository root:

```sh
forge test --match-path test/GravitasSubscriptionIntegration.t.sol --match-test '^test_VerifyAssetCompliance' -vv
forge test --match-path test/GravitasSubscriptionIntegration.t.sol --match-test '^test_AreTokensCompliant' -vv
```

## Sources and limits

- `contracts/GravitasPolicyRegistry.sol`: `setAssetCompliance`, `verifyAssetCompliance`, `areTokensCompliant`.
- `test/GravitasSubscriptionIntegration.t.sol`: `setUp`, `test_VerifyAssetCompliance`, `test_AreTokensCompliant`.
- `docs/TECHNICAL_SPEC.md`, section 1, Invariant 2: documented both-assets rule; the contract and assertions define this scenario's evidence.

The pair test covers both allowed and the second entry unlisted. It does not separately assert first-entry-false or both-false cases; the contract expression implies those results. Neither function checks amount, recipient, investor identity, or caller authorization. An unlisted asset returns `false`; a paused registry instead reverts (ends the call with an error). No transfer, swap, settlement, or external approval is demonstrated. The named tests passed in the full review run. See ../verification.md for execution evidence.
