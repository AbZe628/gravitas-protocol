# CBAR / Azerbaijan — Official-source findings

**Research cut-off:** 11 November 2026. This is a source register for an exploratory technical discussion, not legal advice, an eligibility determination, or a statement of CBAR support.

## Regulatory sandbox

CBAR announced the third application window on 25 June 2026 and stated it would accept applications until 25 August 2026. The deadline has passed. CBAR's public sandbox portal says applications are accepted during windows announced by CBAR. No fourth/open application window was identified in the official pages reviewed for this pass. Phrase this as “no currently open cycle is officially evidenced in the sources reviewed,” not as a claim that no internal or unpublished plan exists.

The official Regulation defines an applicant as an Azerbaijani-registered legal entity applying to test an innovative product in Azerbaijan. The portal lists several applicant categories and collaboration types, but this does not remove the legal-entity rule. A qualifying test is limited, supervised and agreement-based; the agreement defines scope, constraints, user safeguards, reporting, confidentiality, exit and other terms. The sandbox is not a general licence, product approval, endorsement, or blanket waiver of other applicable requirements.

Core sources:

- CBAR, “Central Bank accepts applications for third period of participation in regulatory sandbox regime,” 25 June 2026: https://cbar.az/press-release-5513/central-bank-accepts-applications-for-third-period-of-participation-in-regulatory-sandbox-regime?language=en
- CBAR Regulatory Sandbox portal: https://sandbox.cbar.az/en/
- CBAR, “Regulation on the application of the Regulatory Sandbox,” Board Resolution 06/4, 31 January 2024: https://uploads.cbar.az/assets/Regulation%20on%20the%20application%20of%20Regulatory%20Sandbox.pdf
- Official e-Qanun text: https://e-qanun.az/framework/56351
- CBAR regulation index: https://www.cbar.az/page-234/regulations?language=en

The Regulation and portal materials indicate the application package should address the applicant and its ownership/management, organization, plan/feasibility, product architecture, resources, AML/CFT, risk analysis and mitigations, user information/consent and complaints, test limits and success indicators, privacy/confidentiality, cybersecurity/operational incidents, reporting and data retention, transition/exit and user obligations. Exact obligations depend on the current rule text and CBAR agreement. The Regulation's general maximum testing term is 12 months, with a possible extension up to 6 months subject to conditions and CBAR approval; these details should be rechecked against the authoritative Azerbaijani legal text before external reliance.

## Official strategic context

CBAR's Financial Sector Development Strategy 2024–2026 identifies digital finance, data-centric SupTech/RegTech, automated data submissions, financial-institution data governance, payment-system modernization, cybersecurity and resilience as strategic themes. Its 2024–2029 SupTech Roadmap is oriented toward risk-based supervision, improved reporting and supervisory information systems. These are broad policy priorities; they do not establish demand for Gravitas or a procurement/partnership pathway.

- CBAR, Financial Sector Development Strategy 2024–2026: https://www.cbar.az/2024_2026_English.pdf
- CBAR, SupTech Roadmap overview: https://uploads.cbar.az/assets/f8bff501a49f02fc9272df311.pdf
- CBAR announcement on the SupTech Roadmap: https://cbar.az/press-release-5005/central-bank-approved-supervision-technology-roadmap?language=en
- CBAR, Financial Sector Development Strategy overview: https://www.cbar.az/pages/strategy?language=en

CBAR has documented Open Banking implementation, technical/network requirements and participation by commercial banks and electronic-money institutions. That is market context only; it does not show Gravitas has compatible integration or authority to access data.

- CBAR, Open Banking requirements: https://www.cbar.az/press-release-4941/statement-on-approved-requirements-for-open-banking?language=en
- CBAR, Open Banking rollout (6 October 2025): https://cbar.az/press-release-5292/azerbaijans-financial-market-starts-to-implement-open-banking?language=en
- CBAR, e-money institutions join Open Banking (1 May 2026): https://www.cbar.az/press-release-5474/two-electronic-money-institutions-join-the-open-banking-ecosystem-in-azerbaijan-for-the-first-time?language=en
- Azerbaijan Law No. 987-VIQ, Payment Services and Payment Systems: https://e-qanun.az/framework/54872

CBAR has also reported limited sandbox testing of virtual-asset projects, including both successful extensions and suspensions, and has announced Murabaha/Mudaraba pilot tests. This is evidence of prior activity, not approval of other projects or a general Islamic-finance framework.

- CBAR, first-phase sandbox outcomes (6 August 2025): https://www.cbar.az/press-release-5223/trial-periods-for-regulatory-sandbox-regime-first-phase-finished?language=en
- CBAR, four innovative products including Islamic-finance pilots (26 December 2025): https://www.cbar.az/press-release-5389/four-innovative-products-to-be-tested-within-the-central-banks-regulatory-sandbox?language=en
- CBAR sandbox registry: https://sandbox.cbar.az/en/registry
- CBAR completed sandbox registry: https://sandbox.cbar.az/en/registry/completed
- CBAR, virtual-asset transaction regulation: https://uploads.cbar.az/assets/Regulations%20on%20operations%20with%20virtual%20assets%20in%20the%20Republic%20of%20Azerbaijan.pdf

Additional institutional context includes CBAR's bank corporate-governance/internal-audit standards, electronic-banking audit logs guidance, operational-risk management rules, and cybersecurity strategy. Scope and current legal status must be checked for the specific activity; do not generalize banking obligations to every technology vendor or workflow.

- CBAR, Corporate Governance Standards in Banks: https://www.cbar.az/law-18/decision-no-1951100027?language=en
- CBAR, Bank Information Security Management Regulations: https://www.cbar.az/law-370/regulations-on-information-security-management-in-banks?language=en
- CBAR, electronic-banking guidelines: https://www.cbar.az/law-194/methodological-guidelines-on-supply-and-security-of-electronic-banking-services-in-the-republic-of-azerbaijan?language=en
- CBAR, Operational Risk Management in Banks announcement (13 February 2025): https://www.cbar.az/press-release-4994/banklarda-mliyyat-risklrinin-idar-edilmsi-qaydasi-tsdiq-edilib?language=en
- CBAR, financial-market cybersecurity strategy (12 May 2023): https://www.cbar.az/press-release-4202/central-bank-adopts-cybersecurity-strategy-in-financial-markets?language=en
- Azerbaijan Law on Electronic Signature and Electronic Document: https://e-qanun.az/framework/5916

## Network verification reference

Arbitrum's official chain-information page lists Arbitrum Sepolia as chain ID 421614 and its public RPC as `https://sepolia-rollup.arbitrum.io/rpc`; it also lists Arbiscan and Blockscout explorers. The official endpoint returned HTTP 403 from this sandbox. Arbitrum's page lists PublicNode among third-party RPC providers; PublicNode's Arbitrum Sepolia gateway page publishes `https://arbitrum-sepolia-rpc.publicnode.com`. Any reads through that third-party endpoint must be identified as such and should be independently cross-checked against an explorer or second provider. No write operations are authorized or intended.

- Arbitrum official chain information: https://docs.arbitrum.io/chain-info
- PublicNode Arbitrum Sepolia endpoint page: https://arbitrum.publicnode.com/?sepolia

## Use-case assessment boundary

The official context makes the following topics potentially worth exploring: traceable approvals; structured policy representations; governance/auditability; controlled innovation trials; data-centric RegTech/SupTech; operational-risk tooling; Shariah-conscious product governance; regulated financial-institution integration/Open Banking; tokenised operations; and policy controls for digital-asset activity. This is not evidence that the repo implements these use cases. The components and code status must come from the exact source branch and commit. Legal-entity eligibility, activity classification, consumer safeguards, AML/CFT, privacy, cybersecurity and partner needs require case-specific review.

## Exploratory pathway (not a formal application)

1. Verify code and test evidence at the isolated CBAR branch; select one narrowly scoped demonstrator.
2. Request a preliminary technical discussion and regulatory guidance. Do not ask for or imply approval.
3. Explore an Azerbaijani-registered applicant structure and a regulated local institution as a potential pilot partner, as appropriate to the activity.
4. Confirm product classification, legal requirements, user protection, AML/CFT, data/security, risk and exit controls with Azerbaijani counsel and CBAR.
5. Wait for a publicly announced application window and follow the official process if the project is eligible and ready.

No contact has been sent to CBAR, and no application has been submitted.
