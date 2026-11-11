# Integration-kit fixture scenarios

These six scenarios exercise the local, fixture-backed mock response path only. On 11 November 2026, the example client returned the expected decisions for all six cases against the loopback-only mock (`evidence/cbar/mock-api-six-scenarios.log`). The result is **SIMULATED**, not an on-chain transaction, live API call, payment-orchestration test or Shariah determination.

| ID | Illustrative scenario | Fixture input | Expected / observed | Sample rule |
|---|---|---|---|---|
| S1 | Approved stable-asset sample | USDC address/symbol | ALLOW | POL-001 |
| S2 | Approved utility-asset sample | WETH address/symbol | ALLOW | POL-001 |
| S3 | Approved asset, payout direction | USDC | ALLOW | POL-001 |
| S4 | Interest-bearing category | `interest-bearing` | DENY | R-RIBA-01 |
| S5 | Speculative category | `speculative-gaming` | DENY | R-MAYSIR-01 |
| S6 | Unknown asset | Unlisted address | DENY | DEFAULT-DENY |

## Reproduction

Terminal 1:

```sh
cd integration-kit/mock-server
npm ci
npm start
```

Terminal 2:

```sh
cd integration-kit/sdk-examples
npm ci
GRAVITAS_API=http://127.0.0.1:8787 npm run verify
```

Expected output is `6/6 scenarios passed`. The mock appends request records to `mock-server/audit.log.jsonl`; the example uses synthetic identifiers. Archive or remove that file after local testing.

## What this does not establish

The example client checks only the `decision` string returned by the mock. It does not route or block a real payment, validate the full response schema, check policy versions, authenticate a caller, submit a blockchain transaction, or prove that the mock's fixture agrees with current Registry state. The OpenAPI document declares API-key security, but the mock does not enforce it. The local mock policy file explicitly combines a Sepolia Registry reference with illustrative Arbitrum One token addresses; it is not a live Registry policy set. No hosted API endpoint or API-key issuance process was verified.
