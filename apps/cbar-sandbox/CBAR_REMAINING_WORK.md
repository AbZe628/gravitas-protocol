# CBAR Sandbox — status and remaining work

**Status date:** 11 November 2026. This file distinguishes completed evidence from open work; it is not a readiness certification.

## Delivered and verified

- Interactive, loopback-bound reviewer UI; fixed-address, read-only Arbitrum Sepolia reads; local Foundry test runner restricted to T26/T27; no wallet, private key or network write path.
- Ten source-controlled architecture and evidence diagrams, a reviewer guide, an internal technical review, an evidence register, regulatory research, a 36-case catalogue and three separate English PDFs.
- Four-page executive brief, 30-page institutional technical report and four-page separate investor brief passed the publication-profile PDF verifier. The report's representative contact sheet was reviewed.
- Root Foundry suite: 86 passed, 0 failed. Focused late SafeERC20-failure regression: passed with explicit checks that source NFT owner/liquidity, user token balances and nonce equal their initial state after revert.
- Majlis: 56 test files and 488 tests passed; typecheck and build passed.
- Gravitas SDK: 20 tests and TypeScript build passed. Its development dependency audit still reports two high and two moderate advisories.
- Reviewer app: four tests passed; JavaScript and JSON syntax checks passed.
- Integration-kit: six fixture-backed scenarios passed as simulated responses; mock API audit reported zero advisories after compatible updates.
- A fresh recursive clone reproduced Foundry, reviewer, Majlis and SDK checks. The cloned reviewer server also ran fixed local T26/T27 actions successfully on loopback; exact logs and responses are in `evidence/cbar/clean-checkout-*`.
- One Arbitrum Sepolia read-only snapshot is archived at block `328255709`, chain ID `421614`, through PublicNode. It is single-provider evidence only; no testnet transaction was sent.
- Official CBAR sources reviewed through 11 November 2026 show the third application window (25 June–25 August 2026) has closed; no later open cycle was evidenced in the reviewed sources. Gravitas has no Azerbaijan-registered legal entity; no application, contact, partner, endorsement or approval is claimed.
- Initial email, LinkedIn note, 7- and 14-business-day follow-ups, meeting agenda and technical FAQ are drafts only and have not been sent.

## Open technical work

- Add a dedicated interactive Signed Intent demonstration if it can be implemented safely with test-only keys. Current source review, documentation and test catalogue do not constitute a browser signing demo.
- Execute the twelve catalogue cases marked `NOT EXECUTED`: T08, T09, T12, T13, T19, T20, T22, T23, T24, T32, T33 and T35. Do not infer success from related tests.
- Obtain a second independent RPC-provider snapshot and establish reviewed-source/deployed-bytecode correspondence before relying on live deployment claims.
- Triage the Foundry lint notices recorded in `evidence/cbar/clean-checkout-foundry.log`, especially production V2/V3 external-call, reentrancy, timestamp and ignored-return notices. The `missing-events-access-control` notices for the Registry setter and local WETH9 helper appear inconsistent with emitted events and need independent rechecking. Do not suppress warnings or treat the notices themselves as proof of an exploit.
- Reassess the four SDK development-tool advisories with maintainers; do not force a dependency upgrade without compatibility review.
- The mock compliance API is fixture-only and does not enforce the OpenAPI API-key declaration. No production bank API, production authentication or live institution integration is demonstrated.
- There is no verified Majlis decision → authorized signature → Registry transaction handoff; no KYC, sanctions, investor eligibility or identity-control function; no completed Timelock ownership transfer; and no independent smart-contract or application security audit.
- The currently documented V2 route has no demonstrated live Arbitrum Sepolia DEX path. V3 evidence uses local mocks, not a live/forked Uniswap deployment.

## Open institutional work

- Confirm applicant eligibility, local legal structure, any regulated-institution partner route, activity classification, consumer/user safeguards, AML/CFT responsibility, privacy/data handling, cybersecurity, resilience, reporting, exit and duration with Azerbaijani counsel and CBAR before any pilot proposal.
- Keep this package limited to exploratory technical discussion. It is not a formal sandbox application, licensing package, legal opinion, Shariah ruling or independent audit.

## Publication status

- The isolated `cbar-azerbaijan-sandbox` branch is pushed. The clean-checkout test run was against code commit `54ad95b69daea4000bd71ab0be8a2e3b9e686fd2`; subsequent changes are documentation/evidence updates only.
- No pull request was created. GitHub Actions did not run for a feature-branch push because the workflow triggers only on pushes to `main` and pull requests targeting `main`.
