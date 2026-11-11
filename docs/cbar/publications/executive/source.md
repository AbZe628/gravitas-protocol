# Executive brief

## Gravitas Protocol — exploratory technical evaluation

**Prepared for:** Central Bank of the Republic of Azerbaijan (CBAR), for exploratory discussion only  
**Date:** 11 November 2026  
**Status:** Internal technical review — not an independent security audit  
**Request:** A short technical discussion and guidance; not a formal application or request for approval.

## The request

Gravitas Protocol requests an exploratory technical discussion about whether a narrowly scoped, controlled software evaluation could be relevant and what regulatory route, eligibility information and evidence would be appropriate. The project is not seeking a licence, procurement, programme slot, endorsement, waiver or formal decision through this brief. No application has been submitted and CBAR has not been contacted in connection with this package.

The proposed conversation would focus on three questions: whether policy-aware execution and traceable approval workflows are relevant to an institutional technical review; which Azerbaijani applicant and partner structures may be eligible under current rules; and which user-protection, legal, cyber, operational and evidence requirements should be addressed before any future pilot is considered.

## What Gravitas is

Gravitas is a pre-production software prototype combining an application-level governance workflow (Majlis), an owner-controlled machine-readable Policy Registry and narrowly scoped same-chain liquidity-migration contracts that check Registry rules before specific operations. The design hypothesis is that selected financial workflows may benefit from rules that can be read as structured state and applied by a caller before execution, with a transaction outcome that can be inspected afterward.

This is not a general-purpose compliance system. The Registry does not intercept every token transfer. Enforcement applies only when a caller invokes its checks. The project is not a bank, payment system, regulated financial institution or licensed financial service provider, and its current Teleport operations are not a central-bank payment network.

## What can be reviewed today

- A Solidity 0.8.24 Foundry suite; the final isolated-branch run passed 86 tests with no failures or skips, including a late-failure rollback test that compares selected state before and after a revert.
- Majlis application routes and services for proposal/matter lifecycle, deliberation, vote records, role checks, quorum, objections and decision history. Its seeded institutions, boards and decisions are demonstration data.
- A Policy Registry with owner-controlled asset/router/executor flags, pause state, policy version and policy-history hash.
- Teleport V2 and V3 same-chain liquidity operations using local test fixtures. V2 is not a bridge; V3 migrates a V3-style position NFT and mints a new position.
- Read-only Arbitrum Sepolia inspection of four documented contracts, with one block-pinned snapshot at chain ID 421614, block 328255709, through a third-party RPC provider.
- A loopback-only browser reviewer interface with no wallet, signer or testnet-write path.
- A 36-case evidence-linked catalogue that identifies unsupported cases as `NOT EXECUTED` rather than implying coverage.

The full technical report, source links, run instructions, results and evidence index are supplied separately. Local Foundry transactions use mocks and do not have public transaction hashes. The test-network snapshot is one-provider, point-in-time evidence; it does not establish source-bytecode equality or a working production integration.

## What remains unimplemented or unproven

Majlis cannot submit an on-chain Registry policy update. A Majlis parameter hash is not a cryptographic approval. The complete chain from authenticated institutional decision to authorized signature, Registry transaction, resulting state and independently retained evidence is not implemented.

The project has no KYC, sanctions, accreditation, investor-eligibility or AML/CFT identity-control feature. Registry flags do not verify a person's identity or legal status. The integration-kit API is a fixture-backed local mock, not a production bank API, and the mock does not enforce the API-key security declared in its OpenAPI document.

The V2 route has no usable Arbitrum Sepolia DEX route documented. V3 tests use local mocks rather than a live/forked Uniswap deployment. The observed Registry and engines were not shown as Timelock-owned; the observed Timelock delay was 300 seconds, the zero address had executor role, and no separate emergency pauser was found. The SDK build and tests pass, but its development dependency audit still reports two high and two moderate advisories. No independent security audit, Shariah ruling, certification, institutional user, local partner, customer deployment, revenue or Azerbaijan legal entity is claimed.

## Deployed-state snapshot

At Arbitrum Sepolia block `328255709` (chain `421614`), read-only calls found non-empty code at the documented Registry, Teleport V2, Teleport V3 and Timelock addresses. The Registry reported current version `1`, paused `false`, owner `0xFba6C221af564Ab90e333AEEf4E427f787911B73` and zero pending owner. The Registry and engines were not shown as Timelock-owned. The Timelock delay was 300 seconds; the observed owner had proposer role; the zero address had executor role (open execution). The snapshot is from a single PublicNode endpoint and should be independently rechecked before reliance.

## Why the architecture may be relevant

CBAR publications identify broad policy themes that include digital finance, supervisory technology, data-centric reporting, operational risk, cybersecurity and resilience [1] [2]. This is contextual alignment only; it is not evidence that CBAR has demand for Gravitas, has endorsed the project or intends to procure a system. The potential technical question is whether a bounded demonstration of machine-readable controls, application-level decision records and reproducible transaction outcomes is useful to evaluate.

The ten use-case hypotheses—including policy-controlled digital-asset operations, traceable approval workflows, machine-readable policies, governance and auditability, controlled experimentation, RegTech, operational-risk reduction, Shariah-conscious product governance, financial-institution integration and tokenized operations—are assessed in the technical report. Each assessment separates existing code from missing engineering, institution dependency, legal/regulatory questions and what can be tested locally.

## Regulatory reality and possible pathway

Gravitas currently has no Azerbaijan-registered legal entity. The published third application window ran from 25 June to 25 August 2026 and is closed [3] [4]. No later open cycle is evidenced in the official sources reviewed as of 11 November 2026. CBAR’s published Regulation describes an eligible locally registered applicant and a limited, supervised, agreement-based test [3] [5]. A sandbox is not a general licence, product approval, endorsement or blanket waiver. Whether a regulated local institution could participate as applicant or partner depends on the specific activity and current rules and must be confirmed with CBAR and Azerbaijani counsel.

A cautious route would be: (1) preliminary technical evaluation of one narrow demonstrator; (2) exploratory regulatory guidance; (3) identify a regulated local institution that may independently define a problem and potential partner role; (4) obtain local legal advice on the applicant structure and activity classification; (5) adapt user protections, AML/CFT roles, privacy, cybersecurity, resilience, reporting and exit controls; and (6) consider a future official programme only if eligibility, readiness and timing are confirmed.

## Proposed narrow evaluation

An independent reviewer can inspect the source, run the local Foundry suite, select the successful V3 path, induce a late refund failure and compare specified pre/post state, inspect the separate Majlis/Registry boundary, and review read-only test-network getters. No customer data, user funds or testnet writes are needed. The reviewer interface is loopback-bound and exposes only fixed local test actions and allow-listed network reads.

A useful technical discussion could challenge the assumptions, test boundaries and evidence requirements without treating a successful local test as a real institutional transaction. Atomicity reduces partial state changes only within a single reverted EVM transaction; it does not remove smart-contract, market, oracle, liquidity, key, operational, legal or governance risk, and does not independently establish Shariah compliance.

## Decision gates before any application or pilot

1. Establish a locally eligible applicant structure and evidence of regulated-institution interest.
2. Determine the legal product/activity classification with Azerbaijani counsel and CBAR guidance.
3. Complete an independent smart-contract, API and application-security assessment and the unresolved negative/integration tests.
4. Specify user safeguards, AML/CFT responsibilities, privacy/data handling, cybersecurity, resilience, incident response, reporting and exit controls.
5. Reassess only if a future official application window is announced and current requirements are confirmed.

**Bottom line:** The current package is suitable for a bounded technical discussion and a candid, local-only exploratory evaluation. It is not ready to handle customer funds, production institutional transactions or a formal sandbox application.

**Supporting documents:** [Technical proposal](https://github.com/AbZe628/gravitas-protocol/blob/cbar-azerbaijan-sandbox/docs/cbar/CBAR_TECHNICAL_PROPOSAL.md), [reviewer guide](https://github.com/AbZe628/gravitas-protocol/blob/cbar-azerbaijan-sandbox/docs/cbar/CBAR_REVIEWER_GUIDE.md), [test catalogue](https://github.com/AbZe628/gravitas-protocol/blob/cbar-azerbaijan-sandbox/docs/cbar/CBAR_TEST_PLAN.md), [test results](https://github.com/AbZe628/gravitas-protocol/blob/cbar-azerbaijan-sandbox/docs/cbar/CBAR_TEST_RESULTS.md), [evidence index](https://github.com/AbZe628/gravitas-protocol/blob/cbar-azerbaijan-sandbox/docs/cbar/CBAR_EVIDENCE_INDEX.md), [limitations](https://github.com/AbZe628/gravitas-protocol/blob/cbar-azerbaijan-sandbox/docs/cbar/CBAR_KNOWN_LIMITATIONS.md), [official-source register](https://github.com/AbZe628/gravitas-protocol/blob/cbar-azerbaijan-sandbox/docs/cbar/research-sources.md).

## References

- [1] [CBAR Financial Sector Development Strategy 2024–2026](https://www.cbar.az/2024_2026_English.pdf)
- [2] [CBAR SupTech Roadmap overview](https://uploads.cbar.az/assets/f8bff501a49f02fc9272df311.pdf)
- [3] [CBAR Regulatory Sandbox portal](https://sandbox.cbar.az/en/)
- [4] [Third application window announcement, 25 June 2026](https://cbar.az/press-release-5513/central-bank-accepts-applications-for-third-period-of-participation-in-regulatory-sandbox-regime?language=en)
- [5] [Regulation on the application of the Regulatory Sandbox](https://uploads.cbar.az/assets/Regulation%20on%20the%20application%20of%20Regulatory%20Sandbox.pdf)

[1]: https://www.cbar.az/2024_2026_English.pdf "CBAR Financial Sector Development Strategy 2024–2026"
[2]: https://uploads.cbar.az/assets/f8bff501a49f02fc9272df311.pdf "CBAR SupTech Roadmap overview"
[3]: https://sandbox.cbar.az/en/ "CBAR Regulatory Sandbox portal"
[4]: https://cbar.az/press-release-5513/central-bank-accepts-applications-for-third-period-of-participation-in-regulatory-sandbox-regime?language=en "Third application window announcement, 25 June 2026"
[5]: https://uploads.cbar.az/assets/Regulation%20on%20the%20application%20of%20Regulatory%20Sandbox.pdf "Regulation on the application of the Regulatory Sandbox"
