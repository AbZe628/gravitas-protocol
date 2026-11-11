# CBAR technical evaluation package

This is an exploratory technical review package for independent inspection. It is not a formal regulatory application, a CBAR endorsement, a licence, a security audit, a Shariah ruling or a claim that a financial institution is using Gravitas.

## Start here

1. [`PHASE1_REPOSITORY_AUDIT.md`](PHASE1_REPOSITORY_AUDIT.md) — source and deployed-state findings at the pinned base commit.
2. [`CBAR_REVIEWER_GUIDE.md`](CBAR_REVIEWER_GUIDE.md) — clean checkout and reproducible local commands.
3. [`CBAR_ARCHITECTURE.md`](CBAR_ARCHITECTURE.md) — components, actual edges and absent Majlis-to-Registry handoff.
4. [`CBAR_TEST_PLAN.md`](CBAR_TEST_PLAN.md) and [`CBAR_TEST_RESULTS.md`](CBAR_TEST_RESULTS.md) — 36-case catalogue and actual executions.
5. [`CBAR_EVIDENCE_INDEX.md`](CBAR_EVIDENCE_INDEX.md) — claims mapped to source, tests, RPC reads and official sources.
6. [`CBAR_KNOWN_LIMITATIONS.md`](CBAR_KNOWN_LIMITATIONS.md) and [`CBAR_SECURITY_REVIEW.md`](CBAR_SECURITY_REVIEW.md) — risks and boundaries.
7. [`CBAR_REGULATORY_CONSIDERATIONS.md`](CBAR_REGULATORY_CONSIDERATIONS.md) — verified official-source context and conditional pathway.
8. [`CBAR_TECHNICAL_PROPOSAL.md`](CBAR_TECHNICAL_PROPOSAL.md) — main technical narrative and use-case assessment.
9. `apps/cbar-sandbox/` — local reviewer interface with read-only network inspection and fixed local Foundry success/rollback tests.
10. [`publications/technical/CBAR_INSTITUTIONAL_TECHNICAL_REPORT.pdf`](publications/technical/CBAR_INSTITUTIONAL_TECHNICAL_REPORT.pdf) — 30-page institutional technical report and full evidence-linked test catalogue.
11. [`publications/executive/CBAR_EXECUTIVE_BRIEF.pdf`](publications/executive/CBAR_EXECUTIVE_BRIEF.pdf) — four-page exploratory discussion brief with official-source references.
12. [`publications/investor/CBAR_INVESTOR_BRIEF.pdf`](publications/investor/CBAR_INVESTOR_BRIEF.pdf) — separate four-page internal pre-seed investor brief; not a regulatory submission.

## Environment labels

- **LIVE / DEPLOYED:** existing Arbitrum Sepolia contract addresses; reviewer UI reads only.
- **LOCAL TEST:** actual local Foundry EVM tests with deterministic fixtures/mocks.
- **SIMULATED:** seeded Majlis institutions/records and fixture-backed integration-kit responses.
- **PROPOSED:** future governance/API/pilot work not implemented.
- **NOT AUDITED:** no independent security audit is claimed.

The code and artifacts are kept on the isolated branch `cbar-azerbaijan-sandbox`, based on `692022e1ca34a280f90a198d2455ac3535b3bce2`. The two local Foundry buttons run fixed tests and do not send testnet writes. No CBAR contact or formal application has been made.
