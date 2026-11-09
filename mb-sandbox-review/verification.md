# Verification and gaps

Review date: 9 November 2026. Source reviewed: `692022e1ca34a280f90a198d2455ac3535b3bce2`. This is a focused code and sandbox review, not an independent security audit or certification. No contract source or existing test was changed. All review files are confined to `mb-sandbox-review/` on the branch of that name.

## Verified

`forge build` succeeded using Foundry 1.9.0 and repository compiler settings: Solidity 0.8.24, optimisation on, 200 runs and intermediate-representation compilation (`via_ir`). It printed the existing unused `subscriber` warning and Foundry lint warnings. `forge test` passed **86 tests in nine suites**, with zero failures and zero skipped tests. The review did not run a new coverage analysis or static security scanner.

The local helper deployed the existing registry and `MockERC20` to a fresh Anvil chain, created version 3 and passed six groups of probes. Actual transactions confirmed that `transfer` and `transferFrom` can still succeed after the asset is revoked. A direct token transfer also succeeded while the registry was paused. All five guarded registry checks failed under pause. A raw asset getter still returned true. An unregistered subscriber was accepted when the asset and caller were approved. The helper restored its version-3 snapshot.

The existing mock ran on loopback. `/v1/policies` answered; an unknown dummy asset returned `DEFAULT-DENY`; an empty request returned HTTP 422. An unknown address plus symbol `USDC`, a prohibited category and a non-numeric string amount returned **ALLOW**, with no API key. This is mock file classification, not registry approval. It is caused by `decide()` using address **or** symbol matching before category checks and `validate()` checking only the amount's string type.

The OpenAPI file was validated as OpenAPI 3.0.3. Its 14 Solidity signatures/selectors and calldata examples were checked against the source. It documents two mock HTTP handlers and node `eth_call`; it does not invent registry REST routes.

## Testnet evidence

Read-only RPC requests at approximately `2026-11-09T14:18:25Z` returned chain 421614, block number 327579707, registry version 1, `paused = false` and owner `0xFba6C221af564Ab90e333AEEf4E427f787911B73`. The documented registry address is `0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23`.

Its runtime bytecode was **3244 bytes and matched the locally compiled registry exactly, including metadata**. Both SHA-256 hashes were `b058d10c887059aafd4e2ec309098ecaece7057f93a33b31b4f5ff6868f1d92f`. `policyHistory(1)` was `0x687a974ff8f6ad74a4ba4355e5502668cde3e41cb279579d7100251f6a54f43c`, matching the current source's hash of the initial deployer-executor grant. With version 1 and this source, no asset approval has been recorded. These reads are a dated observation, not a promise about future state. No testnet transaction was sent.

`docs/KNOWN-ISSUES.md` says ownership has not moved to the deployed timelock. The observed registry owner is consistent with that statement. This review did not verify timelock roles, multisig signing thresholds, the other contracts' bytecode, or their current owners. Registry bytecode matching does not verify those separate claims.

## Security and bypass gaps

**No protected sukuk transfer.** `MockERC20` inherits ordinary ERC-20 `transfer` and `transferFrom`, without a registry call. `TokenA` and `TokenB` are also plain test tokens, not sukuk contracts. Calling the registry first does not make a later token transfer enforce it. Other token or settlement routes outside the migration contracts are outside registry control. T4 must close this in the actual integration.

**The subscriber is not checked.** `checkSubscriptionCompliance` reads only the token flag and `isExecutor[msg.sender]`. An approved caller can supply any subscriber, including an unregistered dummy address. It checks no amount, destination, investor eligibility or instrument terms. Per-investor logic is explicitly reserved for future use. Do not present these controls as implemented.

**Pause is not a token-wide stop.** The five `verify*`/`check*` functions revert under pause. Raw `isAssetCompliant`, `isRouterAuthorized`, `isExecutor` and version reads remain available. An integration using only raw getters or ignoring errors can bypass the pause. V2 reads the raw router flag but still makes guarded asset calls before moving liquidity. Both migration engines' owners bypass the executor-list condition in `onlyAuthorized`, but they do not bypass the in-body guarded asset checks. Executor revocation alone therefore does not remove an engine owner's execution authority; registry pause and asset rejection still stop that migration path.

**Router-list scope differs.** `TeleportV2.migrateLiquidityV2` checks `isRouterAuthorized(routerTo)`. `TeleportV3.executeAtomicMigration` uses fixed constructor-supplied `positionManager` and `swapRouter` addresses, with no registry router-authorization check. Revoking a router in the registry does not itself change those V3 addresses or add a check. If router revocation is required for that route, the execution contract must enforce it in a future deployment. No contract fix was made here.

**No execution-version binding.** A read-only registry check returns the current version, but emits no check event. Token transfers and migration events do not contain that registry version. A later, separate version lookup cannot reliably prove which version governed an earlier transfer. The sample record exposes this limit rather than filling it with an invented contract field. T6 is required for an atomic transfer/version record.

**Mock trust and outage handling.** The mock trusts caller-supplied identifiers, has no authentication and does not consult the registry. Amount syntax is not validated. Its `onchainRef` is copied metadata, not an on-chain cross-check. It also has no transfer executor or implemented timeout fallback. A real HTTP consumer decides whether an outage blocks execution. The SDK's `ComplianceService.gatedRead` throws on a failed read rather than allowing; some revert messages are broadly labelled as pause. That is a refusal, not a reliable diagnosis of every service fault. There is no verified production HTTP transfer client in this review. T2, T5 and T7 cover these gaps.

`npm audit` on the locked mock dependencies reported **three vulnerabilities: body-parser high, proxy-addr critical, and qs moderate**. This is the package manager's reported dependency risk, not proof that every advisory is exploitable in this configuration. No dependency changes or public deployment were made. Keep the sandbox bound to loopback.

## Could not verify or is absent

There is no implemented sukuk token/transfer manager, per-investor policy engine, registry REST adapter or contract-emitted per-transfer version audit in the reviewed code. The hosted URL and API keys mentioned in the older integration documents were not tested or supplied. No live successful asset migration is demonstrated by this registry's current empty asset list.

A completed independent security audit, external Shariah certification, regulator approval or standards compliance is not established by this review. The repo documents mainnet as not yet deployed; this review did not independently search for every possible deployment. None of those claims appears as an achieved status in this package.

## Every TODO FOR ABDUSAMED

The complete operational instructions and wording are in [sandbox-access.md](sandbox-access.md). The seven owner-supplied tasks are:

- **T1:** arrange the reviewers' tool-equipped computer or an engineer to run the local review.
- **T2:** supply and test remote HTTP endpoint, authentication and credentials if hosted access is wanted.
- **T3:** supply verified testnet deployment/RPC, funded non-public wallets and authorised write access if a shared exercise is wanted.
- **T4:** supply/build the actual dummy sukuk transfer integration and guard every transfer route.
- **T5:** implement/test fail-closed HTTP outage handling, timeouts, retries and stale-decision policy.
- **T6:** bind the transfer and returned rule version in one transaction; retain policy-change evidence and map it to the governing approval.
- **T7:** harden the mock before hosting: dependency review, authentication and identifier/amount validation.

T2–T7 are not prerequisites for the local source review. They are prerequisites for claiming the corresponding remote, enforced-transfer or audit capability.

## Evidence files and source references

`evidence/test-summary.txt`, `evidence/local-results.json` and `evidence/bytecode-comparison.json` preserve the key results. The executable local probes are in `scripts/check-local.py`. Foundry proofs are linked in each scenario.

Enforcement references: `GravitasPolicyRegistry.checkSubscriptionCompliance`, all five guarded checks, `_recordChange`, the three setters; `MockERC20` and inherited `ERC20.transfer`, `transferFrom`, `_update`; `TeleportV2.onlyAuthorized`, `migrateLiquidityV2`; `TeleportV3.onlyAuthorized`, `executeAtomicMigration`, `_executeRebalancingSwap`; `ComplianceService.gatedRead`; mock `validate`, `decide`, `/v1/verify`. Deployment status references: `docs/DEPLOYMENTS.md` and `docs/KNOWN-ISSUES.md`.
