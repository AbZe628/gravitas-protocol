# 02 — Permitted pair

The integration fixture whitelists dummy asset A at version 2 and a dummy executor at version 3. These checks read address flags; they do not move tokens. Run from the repository root:

```bash
forge test --match-path test/GravitasSubscriptionIntegration.t.sol --match-test '^test_VerifyAssetCompliance' -vv
forge test --match-path test/GravitasSubscriptionIntegration.t.sol --match-test '^test_AreTokensCompliant' -vv
```

Expected: A returns `true`; unlisted address `0x000000000000000000000000000000000000dead` returns `false`. After the fixture adds asset B (`...0101`), `areTokensCompliant(A, B)` returns `true`; replacing B with an unlisted address returns `false`. The proof is in `test_VerifyAssetCompliance` and `test_AreTokensCompliant` in `test/GravitasSubscriptionIntegration.t.sol`. Neither check evaluates investor, amount, transfer parties or caller authorization.
