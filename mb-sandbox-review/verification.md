# Verification record

**Reference implementation, unaudited, for evaluation, not for production.** Results below are from the local checkout and private Anvil chain on 2026-11-09. Captured command output is under `evidence/`. No public deployment was made.

## Checks run

| Check | Result |
|---|---|
| Existing root Solidity build and tests | `forge build` passed; `forge test --summary`: 86 passed, 0 failed, 0 skipped across 9 suites. Outputs are in `evidence/reference-2026-11-09-87091556859d82c7a783dd97346bf83a8ca66fd0/`. No existing contract, test or root Foundry configuration was edited. |
| Existing registry runtime hash before and after | Compared from local compiler output; the hashes must match. Both observations and the comparison are in `evidence/bytecode-comparison.json`. |
| Reference Foundry project | 8 passed, 0 failed, 0 skipped, including 256 fuzz runs; captured output is in the dated evidence directory. |
| Seven scenario runners | Their documented focused test commands were executed; outputs are in the dated evidence directory. |
| API tests | 9 `node:test` cases passed, including auth, invalid input, paused behavior, unavailable RPC, timeout/retry and recovery. |
| Live API with local registry | ALLOW for the registered dummy token; DENY for an unregistered address; a wrong key returns 401. |
| PDF policy-request example | The exact authenticated `GET /v1/policy` request returned HTTP 200 on chain 31337, policy version 3, unpaused; response is in `evidence/`. |
| Live paused registry | The deployed local registry was paused and unpaused. The API returned `DENY / REGISTRY_PAUSED`, then ALLOW after recovery. |
| Live chain outage and recovery | Local Anvil was stopped. The API returned HTTP 503 and `DENY / REGISTRY_UNAVAILABLE`. Anvil was restored from its local state file; the API then returned ALLOW again. |
| Manager audit record | A real local transaction emitted token `Transfer` and manager `TransferChecked` events. The verifier replayed the registry events and recomputed the policy hash. See `reference-audit-record.json` and `evidence/`. |
| New API OpenAPI file | Validated as OpenAPI 3.0.3; output is in `evidence/`. The earlier mock specification is separate. |
| API package audit | `npm audit` reported zero high and critical findings; raw output is in `evidence/`. |
| Docker Compose one-command launch | **Not run:** Docker is not installed in this environment, so the image build and Compose start were unavailable. The component checks were run directly on the local machine. |
| Automated workflow result | **Not confirmed:** the workflow file is present, but a hosted run and artifact have not been verified. |
| Final PDF | 10 pages; absolute-link and hidden-character validation will be recorded after the release tag is created. |

## Contract comparison

The reference token and manager are separate from the existing registry. They do not patch or replace it. The before/after compiled registry runtime hashes are in `evidence/bytecode-comparison.json`; matching values support the claim that the reviewed registry runtime is unchanged.

## What the checks do not prove

The reference code is unaudited and is not an issuer product. These results do not prove an instrument's religious or legal status, investor eligibility, regulator approval, production suitability, security beyond the tested behavior, hosted availability or mainnet readiness. The sandbox is private and local; no shared testnet, external service or production API key exists.

`checkSubscriptionCompliance` accepts a subscriber address but does not use it to decide eligibility. The manager demonstrates asset approval and executor authorization only. It is not an investor-screening service. The old file-driven mock remains separate and does not read registry state.
