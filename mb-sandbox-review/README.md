# Registry sandbox review

**Reference implementation, unaudited, for evaluation, not for production.** This package adds a local gated dummy token, a transfer manager, a registry-backed HTTP API, a fail-closed consumer-client example and reproducible checks. It does not change the registry contract.

## Start here

From the repository root, with Docker installed, run:

```bash
docker compose -f mb-sandbox-review/docker-compose.yml up --build
```

The local sandbox starts Anvil on chain 31337, deploys the registry, plain GUSD, dummy gated sukuk and manager, registers the asset and manager, runs the existing and reference tests, checks all seven scenarios, generates a real local audit record and tests rejection of mutated evidence, starts the API, and prints local addresses, a development-only key and example requests. Ports bind to `127.0.0.1`. No public deployment is made.

In a second terminal, run the full verification:

```bash
docker compose -f mb-sandbox-review/docker-compose.yml exec sandbox bash /workspace/mb-sandbox-review/reference/scripts/verify-all.sh
```

## Run without Docker

The native route is for Linux with Git, Bash, Node 22, Foundry 1.9.0, Python 3 with `venv`, and `curl`. Clone this release with recursive submodules; the reference tests use `forge-std` nested inside OpenZeppelin:

```bash
git clone --recurse-submodules --branch mb-review-v5 https://github.com/AbZe628/gravitas-protocol.git
cd gravitas-protocol
git submodule update --init --recursive
[ -e lib/forge-std ] || ln -s openzeppelin-contracts/lib/forge-std lib/forge-std
```

The link supplies the root Foundry config's expected `lib/forge-std` path. Create a Python virtual environment and install the pinned verification packages from `requirements-verification.txt`. Set `ANVIL_HOST=127.0.0.1 API_HOST=127.0.0.1 ANVIL_PORT=8546 API_PORT=8788` before running `bash mb-sandbox-review/reference/scripts/start-sandbox.sh`. In a second terminal, activate the same environment, set `ANVIL_HOST=127.0.0.1 ANVIL_PORT=8546 API_PORT=8788`, and run `bash mb-sandbox-review/reference/scripts/verify-all.sh`. Full setup, commands, output artifacts and limits are in the [Docker-free native access guide](sandbox-access.md#docker-free-native-run). The CI artifact contains the genuine local test outputs and generated audit record.

The new registry-backed API specification is [`reference/api/openapi.yaml`](reference/api/openapi.yaml). The earlier [`api-spec/openapi.yaml`](api-spec/openapi.yaml) describes the separate file-driven mock and direct JSON-RPC examples; that mock is left unchanged and is superseded for this review.

## Three answers

**Can an approved transfer proceed?** The holder initiates a manager call; the manager checks the asset and its own executor authorization, then moves the fixed dummy token in the same transaction. The token's immutable manager binding prevents direct or delegated transfer routes. The ERC-20 `Transfer` and manager `TransferChecked` events are in that transaction; the latter carries the policy version and hash. The original registry alone does not move or control tokens.

**Can a caller bypass the check or redirect an allowance?** Direct `transfer` and delegated `transferFrom` revert, even when the asset is approved. Only the fixed manager can move the token, and the manager requires `msg.sender == from`; an unrelated caller cannot use the holder's manager allowance to select a recipient. The token also checks registry asset status on every post-construction transfer, mint and burn. The manager's registry check fails if its executor status is revoked or the registry is paused. Plain GUSD is intentionally outside the reference gate. This constrains the demo token's contract routes; it does not establish investor eligibility or govern another token.

**What happens when the API or registry is unavailable?** The API reads one pinned block, uses two-second RPC timeouts with one retry, and returns HTTP 503 with `DENY / REGISTRY_UNAVAILABLE` after both attempts fail. The reference `compliance-client.mjs` also fails closed: it retries only transport/timeouts within a bounded total deadline, never caches a decision, validates chain ID, registry, request ID and evidence fields, and invokes its transfer callback only after a complete valid ALLOW. An unreachable API returns local `UNAVAILABLE` and does not invoke the callback. The API read and later transaction are not atomic; the manager and token independently recheck the on-chain rules in the transaction. The client is an integration seam, not a production signer or transaction system.

`amount`, `channel` and `requestId` are caller-supplied context. They are validated and logged but are not authoritative evidence and do not affect the registry's asset decision. A future identity/eligibility provider would require a separately designed, authenticated source and issuer-approved policy integration; no provider, KYC/AML or investor-eligibility check exists in this package.

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
| Transfer enforcement | **Reference implementation exists (unaudited):** fixed-manager token binding, holder-initiated manager call, caller/recipient amount transfer, registry asset/executor/pause checks, direct/delegated-route refusal and replay-protected request IDs. **Production work remaining:** issuer-specific lifecycle, signing and consent design, permissions, issuance/redemption paths and independent review. |
| One-transaction record | **Reference implementation exists (unaudited):** the manager emits `TransferChecked` after the token's `Transfer`; the verifier binds both logs to calldata, receipt, block hash and the ordered policy history. It rejects tampered serialized records and malformed RPC evidence. **Production work remaining:** approved storage/retention, monitoring, reconciliation, privacy and issuer audit controls. |
| Registry-backed HTTP and outage behavior | **Reference implementation exists (unaudited):** pinned-block reads, bounded RPC retries, no cached ALLOW, and a separate consumer-client example with a bounded fail-closed transfer-callback gate. API decision and transaction are not atomic. **Production work remaining:** key management, network/service hardening, monitoring, privacy controls, deployment and a signed end-to-end integration. |
| Investor eligibility | **Not built.** The registry checks asset status and caller executor status. `checkSubscriptionCompliance` accepts a subscriber address but does not inspect it. No investor identity, KYC/AML, sanctions, accreditation, suitability or recipient eligibility is established. Future identity evidence must come from a separately authenticated and governed provider; caller context is not proof. |
| Ruling link | **Not built.** No instrument-specific ruling, evidence repository or approval workflow is connected to the registry. |
| Governance changes | Partly built in the core repository. GravitasTimelock is deployed on testnet; ownership of the registry has not been handed to it. The engines are single-step Ownable and there is no separate pauser (docs/KNOWN-ISSUES.md). The reference package adds no governance process. |
| Independent audit | **Not built.** No independent audit has been performed on this reference package. |
| Funded shared testnet | **Not built.** The sandbox is private and local. It creates no shared testnet account or funding. |
| Hosted service with keys | **Not built.** The API runs locally and uses a printed development key. |

These statuses do not establish Shariah compliance of any instrument, approval by a regulator, audit, hosted service or mainnet readiness. The demo sukuk is a dummy token with no legal or religious standing.

## Scenarios and source map

Seven short runners live in [`scripts/`](scripts/). Scenario 07 exercises the gated token and manager and regenerates the real local audit record; `reference/scripts/test-audit-verifier.py` mutates that record and RPC replies to test rejection. Reference contracts and tests are in [`reference/src/`](reference/src/) and [`reference/test/`](reference/test/). The registry-backed service and consumer-client example are in [`reference/api/`](reference/api/); deployment and verification tooling are in [`reference/script/`](reference/script/) and [`reference/scripts/`](reference/scripts/).

The old plain-token behavior comes from [`contracts/MockERC20.sol`](../contracts/MockERC20.sol); the registry rules come from [`contracts/GravitasPolicyRegistry.sol`](../contracts/GravitasPolicyRegistry.sol). The local record and its verifier are [`reference-audit-record.json`](reference-audit-record.json) and [`reference/scripts/verify-audit-record.py`](reference/scripts/verify-audit-record.py). The earlier composed, separate-operation example remains in [`sample-audit-record.json`](sample-audit-record.json) and is not evidence of a token transfer.

## Limits of this review

The reference code is unaudited and is not an issuer product. The manager's public function only permits the holder to initiate a transfer from that holder; it does not validate the recipient's identity, eligibility, legal capacity, transaction purpose, or compliance with instrument terms. The registry checks the manager as executor and the asset flag, not the subscriber. While paused, the gated token cannot transfer, mint or burn. An issuer would have to choose and test its pause policy, such as a full freeze or separately governed emergency exit; neither operational choice is made here. The client callback is deliberately generic and does not sign or submit a transaction.

## Production roadmap (not implemented)

1. Obtain an independent security audit of the token-manager architecture, including allowance, initialization, event and key-control threat models.
2. Define issuer-approved token lifecycle, investor identity/eligibility, recipient controls, transfer consent, issuance/redemption, and an enforceable pause/recovery policy.
3. Establish governed administration and key custody for the registry, manager and issuer roles; verify ownership handoff and operational recovery on a controlled testnet.
4. Build and test an authenticated, monitored transaction integration that pins the expected chain/contracts, retains audit evidence under approved privacy/retention rules, and handles reorg/finality and reconciliation.
5. Complete legal, regulatory and instrument-specific review, independent audit remediation and controlled pilot approval before any production or mainnet deployment.
