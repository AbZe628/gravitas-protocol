# Gravitas Integration Kit — local evaluation only

This directory contains an OpenAPI draft, a fixture-backed mock compliance API and a small request client. It is an illustrative local PoC, not a hosted service, regulated integration, Shariah ruling, customer deployment or production compliance control.

## Verified contents

- `openapi/gravitas-compliance-api.yaml` describes the proposed request and response contract.
- `mock-server/` runs an Express service over `policies/sandbox-policies.json`. It binds to `127.0.0.1` by default and appends synthetic requests to a local JSONL file.
- `sdk-examples/verify-client.ts` sends six scenarios to the local mock. Their `PASS` results prove only that the fixture decisions match the expected sample outcomes.
- `sdk-examples/onchain-read.ts` is a separate read-only example. It does not make the fixture API read the live Registry.

## Run the local scenarios

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

The six sample cases are expected to report `6/6 scenarios passed` when the local mock is running. This is simulated evidence from static fixtures; it is not a live API decision, on-chain transaction or proof of financial, legal or Shariah compliance. Requests append to `mock-server/audit.log.jsonl`; remove or archive that local file after a test run.

## Important boundaries

- No hosted compliance API, API key service, production endpoint, service-level agreement or API availability was verified in this review. The earlier hosted URL and “Phase 0 / NDA” language are not supported by execution evidence and must not be treated as an available service.
- The OpenAPI draft declares `X-Gravitas-Key` authentication, but the mock server does not enforce API-key authentication. A request header in the example client is ignored by the mock. Do not expose the mock to a shared or public network.
- The sample policy file labels its network as Arbitrum Sepolia but uses canonical Arbitrum One USDC/WETH addresses for illustrative asset classification. The mock does not query the Registry and its decision must not be represented as an on-chain decision.
- The mock performs limited request-shape checks, not complete schema validation, identity screening or risk assessment. It does not implement KYC, AML/CFT, sanctions, accreditation, investor eligibility, suitability or beneficial-ownership checks.
- Registry allow-list flags are not a universal transfer interceptor. Only contracts that check the Registry are gated.
- No independent security audit or Shariah certification is claimed. Sample classifications are not a religious ruling.

See `../docs/cbar/` for the source-backed technical review, limitations and evidence status.
