# Policy Registry: sandbox review

Reviewed source commit: `692022e1ca34a280f90a198d2455ac3535b3bce2`. Review branch: `mb-sandbox-review`. The package uses local dummy accounts and a plain GUSD token. It contains no sukuk token or sukuk issuance. The transfer bypass described below was reproduced on a fresh local chain.

## In brief

`GravitasPolicyRegistry` keeps owner-managed asset, router and executor lists. Its `checkSubscriptionCompliance` function accepts an asset address and subscriber, checks the asset flag and the caller's executor flag, then returns the current policy version. It does not check the subscriber, transfer parties, amount or instrument terms. The subscriber parameter is unused in the current contract (`contracts/GravitasPolicyRegistry.sol`).

A passing read does not move tokens. The existing dummy `MockERC20` inherits ordinary `transfer` and `transferFrom` without calling the registry. Fresh-chain transactions reproduced a transfer while the asset was unapproved and the registry paused (`evidence/run-2026-11-09-2fbcc41882a3c84dd7efc8defa6768ef0bccf4d8/local-results.json`). This is a real bypass in the present dummy token, not a claim about a missing production sukuk token.

The six scenarios reproduce permitted and prohibited checks, direct and delegated transfer paths, policy changes, pause behavior and owner controls. The API specification covers the file-driven HTTP mock and read-only JSON-RPC calls separately.

## Glossary

- **Whitelist:** an owner-maintained list of permitted addresses.
- **Executor:** a caller address permitted by the registry to request a guarded check.
- **Revert:** a contract call fails and rolls back its changes.
- **Pause:** a registry state in which guarded checks revert.
- **Policy version:** a counter advanced when a registry list changes.
- **Hash:** a fixed-size fingerprint; here each change hash includes the prior hash.
- **Snapshot:** a local-chain save point that can restore earlier test state.

## Three reviewer questions

**Can the rule be bypassed?** Yes, through the current plain token's `transfer` and `transferFrom`; both were tested on Anvil. These functions never call the registry. The migration contracts do call guarded asset checks in their execution paths. `TeleportV2` checks its destination router flag; `TeleportV3` uses constructor-set venues without consulting the registry router list. The engines' owner skips executor authorization, but not the later asset checks.

**What happens when the registry is paused?** Its five guarded checks revert, as existing Foundry tests confirm. A guarded migration cannot continue after its required asset check fails. Direct GUSD transfers remain possible because the token does not consult the registry.

**What happens when the HTTP service is unavailable?** The repository has a local policy-file mock, not a production registry-backed transfer service. No production HTTP outage rule, timeout or retry behavior is implemented. The mock client's example exits on request failure and performs no transfer; that example is not a production enforcement layer.

## What the production version will add

Timing to be agreed for each item.

| Area | Exists today | To build and test | Reviewer input |
|---|---|---|---|
| Transfer enforcement | Plain GUSD never calls the registry; direct and delegated bypasses were reproduced. | A real sukuk token or manager must check the registry inside every balance-changing path: direct, delegated, custody and administrative. Test allowed and refused paths, including each route. | Confirm the instrument, transfer routes and required policy. |
| One-transaction record | The example check and `Transfer` are separate operations. `PolicyUpdated` records only version and change hash. | In one transaction, check and execute; emit transfer, returned version and policy hash together. Test that refusal moves no balance and that logged version/hash match the executed rule. | Decide the required record fields and evidence-retention format. |
| Investor eligibility | `subscriber` is accepted but ignored. The registry checks the asset and calling contract only. | Add per-investor and per-transfer rules, with checks for identity or eligibility, amount and transfer parties where required. Test each rule and its refusal. | Define eligibility inputs, trusted data sources and privacy limits. |
| Registry-backed HTTP | The mock reads a JSON file, has no real authentication and trusts supplied identifiers. | Build an adapter that reads registry state; authenticate callers; validate addresses, amounts, context and request identifiers. Resolve npm audit's one critical, one high and one moderate report. Test invalid inputs, identity, registry disagreement and dependencies. | Supply authentication requirements and approve the remote environment. |
| Outage handling | No production HTTP transfer client or outage policy exists. The example client exits on request failure and sends no transfer. Paused registry checks revert. | Specify timeouts, bounded retries and stale-decision refusal. Test timeouts, RPC/API failure, stale data and recovery. Never treat unavailable or stale permission as approval. | Approve timeout, retry and stale-data limits. |
| Governance | Registry ownership remains with the deployer according to `docs/KNOWN-ISSUES.md`. Engines use single-step `Ownable`; pausing them waits for the owner/timelock path, with no separate pauser role. | Before mainnet, transfer ownership through the documented handover; first add two-step ownership to both engines, then a separate emergency pauser, then exercise the timelock and pause sequence. Test wrong-owner, acceptance and emergency-stop paths. | Approve the owner, timelock delay, signers and pauser authority. |
| Ruling link | Registry stores a change hash, not ruling text or an identifier. The Majlis-to-registry write is not implemented. | Bind a ruling identifier and document digest to each registry version and emit them with the change. Test that the recorded ruling, hash and version resolve to the approved change. | Supply the authoritative ruling identifier and retention rules. |
| Security and deployment | This is a focused source and sandbox review, not an independent security audit. | Complete an independent security audit and resolve findings before any mainnet deployment. Test the release build and deployment procedure against the reviewed source. Nothing ships to mainnet before the audit. | Approve the audit scope and deployment decision. |
| Hosted sandbox and shared testnet | No hosted service or credentials were verified. The documented testnet registry has no approved asset in the dated evidence. | Provide a restricted hosted sandbox with keys, then run a shared testnet exercise with funded non-production accounts after confirming addresses and bytecode. Test access control and read/write permissions. | Provide endpoint, credentials, RPC, funded test accounts and authorized operator. |

## Limits of this review

This review covers the registry source, relevant migration paths, local mock and listed tests at the reviewed source commit. It is not a security audit. The testnet registry runtime was compared with the reviewed source in the dated evidence, but that observation can change. No testnet transaction was sent. The dated read returned registry version 1; no asset approval is recorded in the deployment evidence. The repository describes the system as sandbox/testnet, says no contract has been deployed to mainnet, and says nothing ships to mainnet before the independent security audit (`integration-kit/README.md`, `integration-kit/PROTOCOL-TESTING.md`). No completed independent security audit is documented. This package does not establish regulator approval, Shariah certification or a production hosted service.

The API mock is not the registry. `npm audit` reported one critical, one high and one moderate dependency issue; this count is advisory output, not proof of exploitability. The sample audit record is assembled from separate reads, events and node responses. It does not bind a registry check to the transfer.

## Files and evidence

- [Sandbox access](sandbox-access.md)
- [API specification](api-spec/openapi.yaml)
- [Six scenarios](scenarios/)
- [Sample audit record and explanation](sample-audit-record.md)
- [Verification details](verification.md)
- [Evidence outputs](evidence/)

## Source map

- Registry gates, raw mappings, version and change hash: `contracts/GravitasPolicyRegistry.sol` (`checkSubscriptionCompliance`, verification functions, `_recordChange`).
- Plain token transfer paths: `contracts/MockERC20.sol` and `evidence/.../local-results.json`.
- Migration guards and owner paths: `contracts/TeleportV2.sol`, `contracts/TeleportV3.sol`.
- File-driven HTTP behavior and example client: `integration-kit/mock-server/server.js`, `gravitas-sdk/src/compliance.ts`.
- Governance issues and dated ownership caveat: `docs/KNOWN-ISSUES.md`.
- Dated build, test, registry-runtime and API checks: `evidence/run-2026-11-09-2fbcc41882a3c84dd7efc8defa6768ef0bccf4d8/`.
