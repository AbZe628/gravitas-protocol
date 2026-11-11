# Proposed roadmap — exploratory, not approved

The roadmap is conditional. It does not assert CBAR endorsement, product approval, an open application window, a local partner or a commitment to apply.

| Phase | Outcome | Entry conditions | Status |
|---|---|---|---|
| 1. Preliminary technical evaluation | Independently run the local suite, inspect live read-only state, challenge a successful and failed local scenario, review evidence/limitations. | Separate CBAR branch and reproducible guide. | In progress in this branch. |
| 2. Exploratory institutional discussion | Request technical evaluation and guidance on the regulatory route; ask what evidence CBAR would expect. | Credible factual package; no assumption of acceptance. | Proposed; not contacted. |
| 3. Potential local institution | Identify whether a locally regulated institution has a concrete use case and would independently consider partnership. | Product scope and risks understood by that institution. | Proposed; no partner identified. |
| 4. Eligible applicant structure | Determine the exact Azerbaijani-registered legal entity and applicant/partner roles. | Azerbaijani legal advice and CBAR guidance. | Blocked: Gravitas currently has no Azerbaijan-registered entity. |
| 5. Local adaptation | Adapt product, data, cybersecurity, resilience, AML/CFT, user safeguards, risk, reporting and exit controls to a narrow agreed activity. | Defined legal classification, institution and intended user cohort. | Proposed; no pilot adaptation complete. |
| 6. Future formal programme | Consider an application only if eligible, ready and a future cycle is officially announced. | Current rules, application form, institution, safeguards and explicit founder authorization. | Not open/evidenced in reviewed sources as of 11 Nov 2026. |

## Near-term engineering milestones

1. Pin full-chain test evidence and complete specific signature/intent tests for chain ID, verifying-contract mismatch, allowance/balance, slippage, destination pool and NFT owner checks.
2. Independently verify contract source/runtime bytecode and repeat state reads through a second RPC provider.
3. Decide governance control and emergency-pauser design; if transferring ownership, rehearse the complete two-step handover and Timelock schedule/execute flow on local EVM.
4. Design authenticated institutional integration boundaries and fail-closed handling; do not expose a fixture-backed mock as production API.
5. Obtain independent security review and qualified legal/Shariah review before any regulated pilot claim.
