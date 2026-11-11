# Institutional communication package — drafts only

**No message has been sent.** Confirm the recipient's current title, preferred contact channel and any official intake process before use. Do not attach the investor brief to a regulatory email.

## Initial email draft

**To:** Nargiz Shiraliyeva (verify current role and address before sending)  
**Subject:** Exploratory technical discussion — policy-aware execution prototype

Dear Ms. Shiraliyeva,

I am writing to request guidance on whether a short, exploratory technical discussion would be appropriate for a pre-production software prototype we are evaluating. Gravitas combines an application-level approval workflow, a versioned policy Registry and specific same-chain liquidity-operation contracts that consult policy controls.

We are not submitting an application or seeking an approval, licence, endorsement or sandbox place through this message. We currently have no Azerbaijan-registered legal entity and no local financial-institution partner. We understand that the third application window announced for 25 June–25 August 2026 has closed, and we do not assume a new window is open.

The package distinguishes local test execution, simulated demo data and read-only Arbitrum Sepolia inspection. It also documents material gaps: there is no Majlis-to-Registry transaction path, no KYC or eligibility feature, no independent security audit, and no production bank integration. We would appreciate a short exploratory meeting to ask what technical evaluation route, evidence and eligibility guidance may be appropriate. If the technology appears relevant after initial review, we would be willing to explore an Azerbaijani-registered financial institution as a potential independent pilot partner, subject to local advice and applicable rules.

If useful, we can provide the reviewer guide and access to the independently testable local sandbox, then walk through one successful local mock-based test, one induced late-stage failure and the scoped rollback evidence. Public testnet inspection is read-only. No live customer data, customer funds or testnet write operation would be involved. If, following an initial technical discussion, you believe that Gravitas could be relevant to Azerbaijan's financial innovation ecosystem, we would also appreciate guidance towards appropriate local financial institutions, strategic partners or investment organisations that may independently wish to evaluate the opportunity; we do not ask CBAR to recommend, arrange or guarantee an investment.

Kind regards,

[Founder name]  
[Role / company contact details]

## LinkedIn connection note (short)

Dear Ms. Shiraliyeva — I am exploring a narrow technical evaluation of a pre-production policy-aware execution prototype. We have no Azerbaijan entity or application and are not seeking approval through LinkedIn. If appropriate, I would value your guidance on the correct technical/regulatory contact or public process.

## Follow-up after 7 business days

Dear Ms. Shiraliyeva,

I am following up once on my note about an exploratory technical discussion. We understand there may be no suitable route or open programme at present. If a brief technical overview or a referral to the appropriate public guidance would be useful, I would be happy to provide it. We are not seeking a decision or exception and will not send further follow-ups if this is not the appropriate channel.

Kind regards,
[Founder name]

## Follow-up after 14 business days

Dear Ms. Shiraliyeva,

One final follow-up to close the loop on my earlier inquiry. If there is no appropriate channel or the timing is not suitable, no response is necessary. We will continue to monitor official CBAR programme information and will not infer an open application process from this outreach.

Kind regards,
[Founder name]

## One-page meeting agenda (30 minutes)

1. **Purpose and boundaries (3 min):** exploratory technical discussion only; no application, approval request or claim of partnership.
2. **Prototype and problem hypothesis (5 min):** policy Registry, caller checks, Majlis application workflow.
3. **What is demonstrable (7 min):** local tests, a successful V3 mock migration, a late-failure rollback case, read-only testnet snapshot.
4. **Material gaps and risk (5 min):** no Majlis transaction path, KYC/eligibility, independent audit, local entity, partner or production integration.
5. **Regulatory guidance questions (7 min):** applicant eligibility, local entity and partner path, appropriate classification, expected application evidence, future programme announcements.
6. **Next step or close (3 min):** CBAR guidance/public source, no assumed commitment; share the executive brief only if requested.

## Technical and institutional FAQ

**Is this live production software?** No. It is a pre-production prototype with local mock-based execution tests and read-only inspection of existing Arbitrum Sepolia deployments.

**Has CBAR approved or endorsed Gravitas?** No. No application, contact or partnership is claimed in this package.

**Does Majlis automatically write an approved policy to the Registry?** No. The governance workflow produces an application record/hash. No verified signed authorization and Registry transaction writer is implemented.

**Does the Registry enforce policy on every token transfer?** No. Only contracts that query the Registry are subject to those checks.

**Does Gravitas perform KYC, AML/CFT or investor eligibility screening?** No. No KYC, sanctions, accreditation, beneficial ownership, suitability or investor eligibility function is implemented. AML/CFT responsibilities remain to be determined for any future use case.

**Does the test prove atomicity?** A local Foundry test induces a late refund failure and checks selected state—NFT owner/liquidity, user token balances and nonce—returns to its initial values. This is scoped evidence for a mocked path, not a proof of all system behavior or a claim that atomicity removes all risks.

**What is the governance setup on the testnet?** Registry and Teleport engines remain owned by a single EOA in the observed snapshot, not the deployed Timelock. The Timelock delay is 300 seconds and its executor role is open to the zero address.

**Is an application window open?** The third cycle announced for 25 June–25 August 2026 is closed. The official sources reviewed as of 11 November 2026 did not evidence a later open window. Check CBAR's portal for current information.

**Who can apply?** CBAR's published Regulation describes an Azerbaijani-registered legal entity as applicant. Gravitas currently has no Azerbaijan-registered legal entity. A partner or applicant route requires current CBAR guidance and Azerbaijani legal advice.

**What is the next request?** Guidance on an appropriate exploratory technical route and the evidence/eligibility CBAR expects—not a waiver, approval or commitment.
