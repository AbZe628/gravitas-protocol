# PoC Test Scenarios — Annex A

Six scenarios (3 ALLOW / 3 DENY) proving the pre-routing compliance gate end-to-end.
All six are implemented and runnable via `sdk-examples/verify-client.ts`.

| # | Scenario | Asset / Category | Expected | Rule |
|---|----------|------------------|----------|------|
| S1 | Approved stable asset | USDC (on-chain address) | **ALLOW** | POL-001 |
| S2 | Approved utility asset | WETH (on-chain address) | **ALLOW** | POL-001 |
| S3 | Approved asset, payout direction | USDC | **ALLOW** | POL-001 |
| S4 | Interest-bearing instrument | category `interest-bearing` | **DENY** | R-RIBA-01 |
| S5 | Speculative instrument | category `speculative-gaming` | **DENY** | R-MAYSIR-01 |
| S6 | Unknown asset | unlisted address | **DENY** | DEFAULT-DENY |

## Success criteria (measurable)

1. **6/6 scenarios pass** — S1–S3 routed, S4–S6 blocked.
2. **A DENY transaction cannot be routed** through any orchestration path — the gate
   sits *before* routing, and the default posture is DENY (S6 proves it: anything
   not explicitly approved is blocked).
3. **Complete audit trail** — every verification is appended to
   `mock-server/audit.log.jsonl` as one JSON line (timestamp, asset, decision,
   reason, correlation id), ready to surface in existing reporting.

## Notes for reviewers

- Decision semantics mirror the on-chain source of truth
  (`GravitasPolicyRegistry`, Arbitrum Sepolia — source-verified). The optional
  trustless cross-check is demonstrated in `sdk-examples/onchain-read.ts`.
- The inactive-policy case (POL-003 / `LEGACY`) shows re-certification handling:
  an asset that *was* approved is DENY the moment its policy is not active.
- Amounts are decimal strings end-to-end; no float precision loss.
