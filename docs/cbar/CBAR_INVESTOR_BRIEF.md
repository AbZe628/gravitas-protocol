# Gravitas Protocol — pre-seed investor brief

**Internal draft for investor discovery only**  
**Date:** 11 November 2026  
**Separation notice:** This document is not part of a regulatory application or a CBAR submission. A technical discussion with a regulator would not imply endorsement, approval, investment or customer traction.

## 1. Company and product

Gravitas Protocol is exploring policy-aware execution for selected on-chain financial workflows. The pre-production prototype combines three main elements: (1) Majlis, an application-level proposal, deliberation and voting workflow; (2) an owner-controlled Policy Registry with versioned asset, router and executor flags; and (3) Teleport V2/V3 contracts that check Registry rules for specific same-chain liquidity operations.

The long-term product hypothesis is that financial institutions and infrastructure operators may need controls that are legible to governance teams, machine-readable at execution time and reproducible afterward. The present product is not a general compliance platform, a bank, a payment system or a licensed financial service.

## 2. Problem hypothesis

Organizations evaluating programmable financial operations may need a reliable way to translate defined policies into checks that are applied before selected actions, and to review the records explaining what changed and what happened. Today, many teams use a mixture of written policy, application-specific logic, manual approvals and operational logs. Whether that creates a sufficiently urgent, fundable problem for a dedicated product is unvalidated.

No customer discovery, signed institutional user, paid deployment, bank integration, procurement process or validated market demand is claimed in this brief. The next step is structured problem discovery with potential users, not a top-down market-size assertion.

## 3. Product architecture and current evidence

The existing prototype contains:

- **Majlis:** an application-level lifecycle for proposal/matter records, reasoning, votes/quorum, objections and decision records. Seeded institutions, members and votes are simulated. Majlis does not submit a signed on-chain Registry policy update.
- **Policy Registry:** owner-controlled asset/router/executor flags, pause state, version and a policy-history hash. A Registry flag becomes an execution control only when a calling contract checks it; the Registry does not intercept arbitrary transfers.
- **Teleport V2:** a same-chain V2-style liquidity operation using caller-supplied factories and authorized routers. It is not a cross-chain bridge and no usable Arbitrum Sepolia V2 route is documented.
- **Teleport V3:** EIP-712-authorized migration of a V3-style liquidity-position NFT to a newly minted position, with nonce/deadline and local-mock full-flow tests.
- **SDK and integration kit:** read/simulate/calldata helpers and a local JSON fixture API. Neither is a verified production bank API or transaction-submitting wallet.
- **Reviewer package:** loopback-only local app, 36-case evidence-linked catalogue, local test runner and a read-only test-network snapshot.

The final local verification run passed 86 Foundry tests, Majlis’s 488 tests, 20 SDK tests and 4 reviewer-app tests. The mock integration example passed six fixture scenarios; those results are simulated. The late-failure test compares selected source NFT, liquidity, user-balance and nonce state before and after revert. There is no independent security audit. A single-provider Arbitrum Sepolia read-only snapshot found code at four documented addresses; bytecode equality to the current source and second-provider agreement were not established.

These are engineering outputs, not revenue, a market signal, a customer reference, regulatory approval or proof of product-market fit.

## 4. Target customer hypotheses

Potential user categories to validate—not current customers—include:

- Financial institutions exploring controlled programmable-asset operations or tokenized products.
- Regulated fintechs or infrastructure providers that need versioned policy state and auditable integration controls.
- Protocol operators that want caller-side allow-list or pause checks for specific execution routes.
- Compliance, risk or technology teams that need to inspect policy changes and test failure behavior.

These categories may require different products, procurement routes, regulatory classifications and trust models. No interview evidence or buying authority has been recorded here. Before investor circulation, the founder should identify the first user persona, budget owner, specific workflow, cost of the current workaround and evidence of willingness to test or pay.

## 5. Market opportunity and competitive landscape

No total-addressable-market, serviceable-market or revenue number is provided because the project has not assembled a verified market model. Any future sizing should define a specific geography, regulated activity, software category, buyer, procurement path and comparable pricing; it should cite reproducible external data and separate software spend from transaction value.

A competitive landscape has not yet been independently mapped. Relevant comparison groups may include policy engines and rules platforms, institutional custody/compliance systems, workflow and GRC software, tokenization infrastructure, smart-contract access-control libraries, and protocol-specific execution tools. This list is a research agenda, not a claim that Gravitas is superior to or substitutes for any named provider.

Potential differentiation to test includes keeping application-level human reasoning distinct from on-chain policy state; using version/hash evidence for policy changes; applying explicit caller-side checks before a narrow operation; and reproducing success and rollback behavior locally. None is claimed as unique, patented, defensible or difficult to copy. The governance-to-Registry signing path is still missing, and the production API is not established.

## 6. Business-model hypotheses

Possible models to investigate—not selected or validated—include enterprise software licensing, implementation and integration services, support and control-evidence tooling, or usage-based access to a hosted policy service. Each would require a clear customer, security and operating model, pricing test, support obligations and regulatory analysis. The local mock API is not a hosted service and does not establish a SaaS product.

Before investor circulation, the founder should choose a primary model, pricing hypothesis, sales cycle, contracting entity and delivery responsibility. Do not present protocol fees, token economics or software pricing as approved until the founder supplies evidence and a legal review.

## 7. Financing objective and use of funds

No funding amount, valuation, instrument, committed investor, runway or use-of-funds budget is verified in this package. These are intentionally not invented.

- **Funding target:** Not supplied; the founder should confirm amount, currency, instrument and target close period.
- **Valuation / cap / discount:** Not supplied; confirm if applicable.
- **Current cash/runway:** Not supplied; verify from company records.
- **Use-of-funds allocation:** Not supplied; prepare a budget for security review, product engineering, integration, legal/regulatory work, operations and other evidenced categories.
- **Milestone-based release plan:** Not supplied; specify measurable outcomes, accountable owners and budget per milestone.

A future pre-seed plan should tie the ask to independently reviewable milestones: security assessment, governance authorization design, a verified integration prototype, local legal analysis, partner discovery and controlled user research. It must not imply that a regulator will approve the project or that an investor receives regulatory access.

## 8. Milestones and execution gates

1. **Technical credibility:** resolve the live owner/Timelock design, complete the governance-to-authorized-Registry path, add missing wrong-chain/verifying-contract and output-bound tests, and obtain an independent smart-contract review.
2. **Integration readiness:** implement authenticated API access and response validation, define observability and incident handling, and test against pinned external dependencies rather than only mocks.
3. **Customer discovery:** interview target users, document the problem and workflow, identify the budget owner and test willingness to participate; report actual evidence and disconfirming results.
4. **Institutional pathway:** obtain Azerbaijan legal advice, identify a regulated local institution only through an independent exploratory process, and confirm the eligible applicant structure and current regulator requirements.
5. **Commercial validation:** test one business model and pricing hypothesis with a defined buyer; do not infer demand from an exploratory regulator conversation.

Dates, costs, accountable team members and quantitative success measures have not been supplied and must be verified before external circulation.

## 9. Team and company information

No founder biographies, prior exits, technical credentials, company jurisdiction, cap table, employee roster or adviser relationships are verified in this repository audit. Do not use implied credentials or invented institutional affiliations.

The repository review does not establish the legal entity or jurisdiction; founder identities, roles or verified experience; current team or hiring plan; ownership/cap table or existing commitments; or company contact and materials owner. The founder should supply and verify these facts before investor circulation.

## 10. Risks and current status

The project has no Azerbaijan-registered entity, no CBAR application, no identified local bank partner and no currently open CBAR cycle officially evidenced in the source review (cut-off 11 November 2026) [1] [2]. It is not a licensed financial service, bank, payment system, certified Shariah product or independently audited production protocol. No customer funds or customer data were involved in local tests.

Major technical risks include the missing governance-to-Registry authorization path, owner and Timelock arrangements, lack of a separate fast pauser, V3 recovery and minimum-output issues, untested production API authentication, mock-only external integrations and unresolved SDK development-dependency advisories. There is no KYC, sanctions, accreditation, investor-eligibility or AML/CFT identity-control feature. The local evidence is useful for diligence, but does not establish commercial traction or operational readiness.

**Bottom line:** The prototype provides material engineering artifacts for evaluation. The commercial problem, buyer, market size, competitive position, business model, team and financing plan still require founder evidence and independent validation. Keep this investor document separate from the CBAR executive and technical documents.

## References

- [1] [CBAR Regulatory Sandbox portal](https://sandbox.cbar.az/en/)
- [2] [Third application window announcement, 25 June 2026](https://cbar.az/press-release-5513/central-bank-accepts-applications-for-third-period-of-participation-in-regulatory-sandbox-regime?language=en)

[1]: https://sandbox.cbar.az/en/ "CBAR Regulatory Sandbox portal"
[2]: https://cbar.az/press-release-5513/central-bank-accepts-applications-for-third-period-of-participation-in-regulatory-sandbox-regime?language=en "Third application window announcement, 25 June 2026"
