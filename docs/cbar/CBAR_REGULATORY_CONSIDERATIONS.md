# Azerbaijan regulatory considerations

**For exploratory technical discussion only. Not legal advice, an eligibility opinion or a formal application.**  
**Research cut-off:** 11 November 2026.

## Current position

Gravitas Protocol currently has no Azerbaijan-registered legal entity. CBAR's published Regulatory Sandbox Regulation defines an applicant as an Azerbaijani-registered legal entity seeking to test an innovative product in Azerbaijan. The portal describes applicant categories and collaboration, but does not remove the applicant legal-entity requirement. A local regulated financial institution may be a potential partner or applicant only if the exact activity, structure and official rules permit it; this must be confirmed with Azerbaijani counsel and CBAR.

The third application window was announced for 25 June through 25 August 2026 and has closed. No later/open cycle is officially evidenced in the official pages reviewed as of the research cut-off. Do not infer that another cycle is open or that this project has been invited, accepted or approved.

The sandbox is a supervised, limited test under an agreement. It is not a general licence, blanket waiver, production approval, endorsement or replacement for applicable legal requirements. The Regulation describes a general maximum testing period of 12 months with a possible extension up to 6 months subject to conditions and CBAR approval. Before relying externally on timing or duties, confirm the authoritative Azerbaijani legal text and current CBAR procedure.

## Application readiness information to obtain

An eligible applicant would need to confirm the current application form, ownership/management and organization data, product and technical architecture, feasibility and resources, test boundaries and success criteria, user disclosures/consent/complaints, AML/CFT controls, risk analysis and mitigations, privacy/confidentiality, cybersecurity and operational incident handling, reporting, data retention, transition/exit and user obligations. The applicable requirements depend on the activity, the current rules and the CBAR agreement. This package is not a completed application and does not purport to satisfy that checklist.

The legal and risk analysis must identify the actual product classification and parties, including whether a proposed activity would involve payment services, virtual assets, custody, intermediation, investment activity, banking activity or another regulated service. Gravitas is not represented as a bank, payment system, regulated financial institution, licensed service provider or local legal entity.

## Potential local pilot structure

A cautious route is: (1) preliminary technical evaluation of a narrow demonstrator; (2) exploratory discussion asking for regulatory guidance; (3) identify an Azerbaijani regulated financial institution as a possible independent pilot partner; (4) determine the eligible Azerbaijani applicant structure and contractual roles; (5) obtain local legal advice and adapt consumer protection, AML/CFT, data, cybersecurity, resilience, risk, operations, reporting and exit controls; and (6) consider a future officially announced programme only if eligibility and readiness are established. No CBAR contact or application has been made as part of this work.

## Ten potential-use-case assessments

These are hypotheses for evaluation, not evidence of existing customer demand or implementation.

| Use case | Actual problem to test | Existing Gravitas component | Work still required | Institution / approval dependencies | Controlled test now |
|---|---|---|---|---|---|
| Policy-controlled digital-asset operations | Whether a caller can block a defined operation when an allow-list or pause rule fails. | Registry flags; V2/V3 caller checks. | Scope the asset and activity; improve emergency governance and monitoring; verify source/deployment correspondence. | A regulated institution must define permitted assets and responsibilities; classify the activity with counsel/CBAR. | Yes, with test tokens and local contracts; testnet is read-only. |
| Traceable approval workflows | Whether a reviewer can reconstruct who submitted, deliberated and decided in an application workflow. | Majlis records, roles, vote/quorum/lifecycle and audit data. | Production-grade identity, durable records, data retention and independent verification. | Institution owns the governance policy; privacy and recordkeeping review. | Yes, with seeded demo data labeled simulated. |
| Machine-readable financial policies | Whether a narrow policy parameter set can be versioned and checked deterministically. | Registry asset/router/executor allow-lists, pause, version/hash. | Define a finite policy schema, change control, effective dates and provenance; add governance bridge only after separate design/security work. | Financial institution must specify authoritative policies; legal/regulatory meaning remains external. | Yes, in local EVM with test fixtures. |
| Institutional governance and auditability | Whether policy decisions and changes can be independently reconstructed. | Majlis application records and Registry events/version history. | Complete role-to-signature-to-transaction linkage; independent log retention and access controls. | Institution's board/committee authority and audit standards. | Partial; local records/events can be challenged, not represented as institutional approvals. |
| Controlled digital-finance experimentation | Whether a narrow transaction path can be evaluated safely without live funds. | Local EVM/Foundry harness and read-only testnet inspection. | Reviewer-ready scenario fixtures, risk controls, participant safeguards and exit plan. | Future eligible applicant and formal CBAR agreement if using sandbox regime. | Yes, local only. |
| RegTech infrastructure | Whether policy state and machine-readable evidence can support control testing/reporting. | Registry read checks, hashes and local mock integration kit. | Real institution APIs, authentication, threat model, audit retention and operational service controls. | Institution and regulator determine reporting/security requirements. | Partial, using local fixtures; no production API asserted. |
| Operational risk reduction | Whether a transaction either completes all steps or reverts without partial on-chain state within one transaction. | EVM atomic V2/V3 calls and rollback assertions. | Broader fault injection, monitoring, recovery, dependency and incident controls. | Institution must assess residual and non-chain operational risks. | Yes, with local tests; atomicity does not remove all risk or all gharar. |
| Shariah-conscious product governance | Whether structured parameters can be reviewed and tied to a policy version. | Hashing and Registry flags; Teleport migration constraints. | Qualified Shariah governance, product terms, ongoing review, legal analysis and real provenance. | Independent qualified scholars and relevant institution/regulatory/legal approval. | Technical parameter mechanics only; no Shariah certification or ruling. |
| Financial-institution integration | Whether a defined integration could safely retrieve policy or submit authorized instructions. | Read/simulate/calldata SDK and local API examples. | Authentication, production API, integration contract, SLAs, security review and error mapping. | A licensed institution, data/controller roles and formal technical/security approval. | Mock API and local client work only; not a live bank integration. |
| Controlled testing of tokenized operations | Whether a specific token/NFT operation can be tested with traceable state and clear revert behavior. | Same-chain V2 LP and V3 position-NFT migration. | Realistic environments, liquidity, legal/product model, asset controls and user protection. | Institution, legal counsel and CBAR must determine asset/activity status and lawful scope. | Local test mocks; no live institutional assets or funds. |

## Regulatory and operational questions before any pilot

The team should obtain written guidance on applicant eligibility and local registration, whether a regulated institution may apply or partner, product readiness, consumer protection, AML/CFT, risk assessment, privacy/data location and retention, cybersecurity, operational resilience, testing limits, exit, duration and reporting. Legal counsel should also review virtual-asset and payment-services scope where relevant. The official materials are linked in [`research-sources.md`](research-sources.md).

## References

- CBAR Regulatory Sandbox portal: <https://sandbox.cbar.az/en/>
- Third-cycle announcement (25 June 2026): <https://cbar.az/press-release-5513/central-bank-accepts-applications-for-third-period-of-participation-in-regulatory-sandbox-regime?language=en>
- Regulation on the application of the Regulatory Sandbox, Board Resolution 06/4 (31 January 2024): <https://uploads.cbar.az/assets/Regulation%20on%20the%20application%20of%20Regulatory%20Sandbox.pdf>
- Official e-Qanun text: <https://e-qanun.az/framework/56351>
- CBAR Financial Sector Development Strategy 2024–2026: <https://www.cbar.az/2024_2026_English.pdf>
- CBAR SupTech Roadmap overview: <https://uploads.cbar.az/assets/f8bff501a49f02fc9272df311.pdf>
- CBAR Open Banking requirements: <https://www.cbar.az/press-release-4941/statement-on-approved-requirements-for-open-banking?language=en>
- Law No. 987-VIQ, Payment Services and Payment Systems: <https://e-qanun.az/framework/54872>
