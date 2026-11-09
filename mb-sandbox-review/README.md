# Policy Registry sandbox review

This package reviews `GravitasPolicyRegistry` at source commit `692022e1ca34a280f90a198d2455ac3535b3bce2`. It uses dummy accounts and tokens. It does not demonstrate a real sukuk issuance or an enforced sukuk transfer.

## Read in this order

1. [Sandbox access](sandbox-access.md): install the tools and run the local chain.
2. [Scenario 1](scenarios/01-simulated-sukuk-transfer.md): start with a simulated tokenised sukuk transfer. It includes the three answers about permission, bypass and outages.
3. [Scenarios 2–6](scenarios/): pair approval, rejection, version changes, pause and unauthorised policy writes.
4. [API specification](api-spec/openapi.yaml): the two existing mock HTTP endpoints and the real registry calls through a blockchain node. There is no registry REST adapter in the repo.
5. [Sample audit record](sample-audit-record.json) and [explanation](sample-audit-record.md): a composed local example, with the limits of the current audit trail.
6. [Verification and gaps](verification.md): what was run, what remains unverified and the owner-supplied tasks.

The combined `mb-sandbox-review-package.pdf` contains this starting page, access instructions, all six scenarios, the three answers and the sample audit record. The YAML and executable helpers remain in this folder.

## Live today versus still missing

| Area | Present and verified | Missing or still in development |
|---|---|---|
| Registry | Asset, router and executor lists; pause; version counter and change hashes. 86 existing Foundry tests passed. | Investor-specific checks: `subscriber` is ignored. |
| Testnet | Documented Arbitrum Sepolia registry has matching runtime bytecode; version 1; not paused. | No asset approved. Not a ready-to-run transfer demonstration. |
| HTTP API | Local `/v1/verify` and `/v1/policies` mock runs from a JSON file. | Registry-backed HTTP service and authentication are not implemented in the reviewed mock. Hosted access is unverified. |
| Transfer enforcement | Existing migration engines check assets inside their execution path. | No sukuk token/manager. The dummy token's direct and delegated transfers do not check the registry. |
| Audit | `PolicyUpdated(version, policyHash)` and returned subscription-check version. | No single contract record binding transfer, rule version and outcome. |
| Production | Repository documents testnet use. | Mainnet deployment, completed independent audit and external certification are not established by this review. |

A whitelist is a list of addresses approved by the registry owner. It does not independently assess an instrument's terms. A passing check returns facts; it does not move tokens. A paused check reverts, meaning that the call fails. A real transfer integration must stop on that failure and must not provide another unchecked route.

Source references and every **TODO FOR ABDUSAMED**, T1–T7, are in the linked verification and access guides.
