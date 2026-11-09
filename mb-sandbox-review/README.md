# Registry sandbox review

**Reference implementation, unaudited, for evaluation, not for production.** This package adds a local gated dummy token, a transfer manager, a registry-backed HTTP API and reproducible checks. It does not change the registry contract.

## Start here

From the repository root, with Docker installed, run:

```bash
docker compose -f mb-sandbox-review/docker-compose.yml up --build
```

The local sandbox starts Anvil on chain 31337, deploys the registry, plain GUSD, dummy gated sukuk and manager, registers the asset and manager, runs the existing and reference tests, checks all seven scenarios, starts the API, and prints local addresses, a development-only key and example requests. Ports bind to `127.0.0.1`. No public deployment is made.

In a second terminal, run the full verification:

```bash
docker compose -f mb-sandbox-review/docker-compose.yml exec sandbox bash /workspace/mb-sandbox-review/reference/scripts/verify-all.sh
```

The new registry-backed API specification is [`reference/api/openapi.yaml`](reference/api/openapi.yaml). The earlier [`api-spec/openapi.yaml`](api-spec/openapi.yaml) describes the separate file-driven mock and direct JSON-RPC examples; that mock is left unchanged and is superseded for this review.

## Three answers

**Can an approved transfer proceed?** The reference manager checks the live registry and transfers the dummy token in one transaction. Its event records the policy version and hash. The original registry check alone does not move or control tokens.

**Can a caller bypass the check?** The reference `GatedDemoSukuk` checks the registry on direct transfers, delegated transfers, mint and burn after construction. The original plain GUSD token remains transferable without a registry check. The new guard applies only to the reference token.

**What happens when the API or registry is unavailable?** The reference API reads one pinned block, times out after two seconds, retries once, then returns HTTP 503 with `DENY / REGISTRY_UNAVAILABLE`. A paused registry returns `DENY / REGISTRY_PAUSED`. It never serves a cached ALLOW. No production transfer client exists.

## Glossary

- **Gated token:** a token that checks registry state before a balance-changing operation.
- **Executor:** a contract allowed by the registry to call its subscription check.
- **Approved asset:** a token whose registry asset flag is true.
- **Policy version:** a counter advanced by each recorded registry rule change.
- **Policy hash:** a commitment to a rule change and the preceding hash.
- **Pinned block:** the chain block number used for all reads in one API decision.
- **Pause:** the registry state that makes guarded checks fail.

## What exists and what remains

| Area | Status |
|---|---|
| Transfer enforcement | **Reference implementation exists (unaudited); production work remaining:** issuer-specific token behavior, operational permissions, integration with a real issuance and redemption process, and independent review. |
| One-transaction record | **Reference implementation exists (unaudited); production work remaining:** storage and retention rules, monitoring, reconciliation, identity binding and issuer-approved audit controls. |
| Registry-backed HTTP and outage behavior | **Reference implementation exists (unaudited); production work remaining:** key management, network and service hardening, monitoring, privacy controls, and an approved deployment. |
| Investor eligibility | **Not built.** `checkSubscriptionCompliance` accepts a subscriber address but the registry does not inspect it. The API and token do not establish investor identity or eligibility. |
| Ruling link | **Not built.** No instrument-specific ruling, evidence repository or approval workflow is connected to the registry. |
| Governance changes | **Not built.** The existing registry is owner-controlled; this package adds no governed policy process, timelock or issuer operations. |
| Independent audit | **Not built.** No independent audit has been performed on this reference package. |
| Funded shared testnet | **Not built.** The sandbox is private and local. It creates no shared testnet account or funding. |
| Hosted service with keys | **Not built.** The API runs locally and uses a printed development key. |

These statuses do not establish Shariah compliance of any instrument, approval by a regulator, audit, hosted service or mainnet readiness. The demo sukuk is a dummy token with no legal or religious standing.

## Scenarios and source map

Seven short runners live in [`scripts/`](scripts/). Scenario 07 exercises the gated token and manager and regenerates the local audit record. Reference contracts and tests are in [`reference/src/`](reference/src/) and [`reference/test/`](reference/test/). The registry-backed service is in [`reference/api/`](reference/api/). The deployment script and local setup are in [`reference/script/`](reference/script/) and [`reference/scripts/`](reference/scripts/).

The old plain-token behavior comes from [`contracts/MockERC20.sol`](../contracts/MockERC20.sol); the registry rules come from [`contracts/GravitasPolicyRegistry.sol`](../contracts/GravitasPolicyRegistry.sol). The local record and its verifier are [`reference-audit-record.json`](reference-audit-record.json) and [`reference/scripts/verify-audit-record.py`](reference/scripts/verify-audit-record.py). The earlier composed, separate-operation example remains in [`sample-audit-record.json`](sample-audit-record.json) and is not evidence of a token transfer.

## Limits of this review

The reference code is unaudited and is not an issuer product. A local test proves only the checked behavior in this dummy setup. The manager's registry check uses the manager address as caller; the subscriber argument is not an eligibility check. While the registry is paused, the gated token cannot transfer, mint or burn. An issuer would have to choose and test its pause policy, for example a full freeze or a separately governed emergency exit with narrow conditions. Neither choice is made here.
