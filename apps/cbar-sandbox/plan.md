# CBAR Sandbox — implementation plan

## Scope and constraints

Build `apps/cbar-sandbox` as a separately runnable reviewer interface inside the `cbar-azerbaijan-sandbox` repository branch. The application provides read-only network inspection and a fixed allow-list of local Foundry test runs; it never submits on-chain transactions, accepts wallet connections, passes private keys to child processes, or presents local mock data as institutional activity. Source-of-truth is the audited commit `692022e1ca34a280f90a198d2455ac3535b3bce2` plus explicitly labelled current read-only Arbitrum Sepolia observations. No contract source or Multibank reference code may be modified.

## Design options and selection

Three plausible low-probability visual directions were considered: Swiss institutional editorial (0.06), instrument-panel terminal (0.04), and restrained archival-paper interface (0.08). **Selected: Swiss institutional editorial**. The interface uses a calm paper background, dark ink typography, forest-green status for verified reads, amber for caveats, and a narrow evidence rail. It avoids marketing gradients, crypto motifs, fabricated metrics, fake seals and fake certification marks.

- **Design movement:** Swiss International Typographic Style adapted for a central-bank evaluation dossier.
- **Core principles:** evidence before claims; each result carries an environment/state label; transparent errors; no network-write capability.
- **Color philosophy:** ink and warm paper for legibility; forest green for measured live/verified status; amber for unresolved or simulated items; muted grey for proposed work.
- **Layout paradigm:** left evidence/navigation rail paired with a wide, vertically flowing review canvas; important facts are not compressed into a decorative dashboard grid.
- **Signature elements:** compact environment badges (`LIVE READ`, `LOCAL TEST`, `SIMULATED`, `PROPOSED`, `NOT AUDITED`); thin amber evidence markers linking claims to sources.
- **Interaction philosophy:** explicit refresh for read-only state; every live RPC failure remains visible; two fixed buttons run local Foundry success/rollback tests and display actual output.
- **Animation:** none by default; respect reduced-motion settings.
- **Typography:** installed-system sans for prose, system monospace for addresses, selectors and hashes; no remote font dependency.
- **Brand essence:** inspectable policy-aware transaction infrastructure for technical reviewers; precise, candid, restrained.
- **Brand voice:** headlines state function, not aspiration. Example lines: “Read the deployed policy state.” “A successful local test is not a live-chain transaction.”
- **Wordmark concept:** a simple bracketed `G` formed from an open rectangular path and a short horizontal policy line; no official CBAR logo or invented certification marks.
- **Signature brand color:** deep forest green `#174D3B`.

## Architecture and implementation

Use a dependency-free Node HTTP server and browser-native HTML/CSS/JavaScript, with a strict read-only JSON-RPC proxy to the PublicNode Arbitrum Sepolia endpoint. The server binds to loopback and allow-lists only `eth_chainId`, `eth_blockNumber`, `eth_getCode` and a fixed set of `eth_call` selectors used for Registry/Teleport/Timelock getters. It rejects write-like methods and arbitrary RPC targets. One loopback-only, same-origin JSON POST route accepts only T26 or T27 and runs fixed `forge test` argument arrays with `shell:false` and a minimal environment; it does not accept user commands or credentials. The browser renders actual local test output. If the network cannot be read, the UI shows an explicit unavailable state instead of cached success.

The reviewer surface covers: institutional overview and scope; architecture and state boundaries; Majlis maturity and seeded-data disclaimer; live read-only deployment state; Registry read/write function inventory from the published ABI; Teleport V2/V3 implementation boundaries; interactive local success and late-failure rollback scenarios; local test commands/results; the 36-case catalogue with evidence links; known limitations; regulatory status and source list. A static route manifest includes every page. Deployment is intentionally not configured until the repository owner chooses a hosting route.

## Reproducibility

`npm start` runs the local reviewer server. `npm test` runs server unit tests using Node's built-in test runner. The T26/T27 controls invoke actual local Foundry tests when Foundry is installed; output explicitly states no network transaction was sent. Root Foundry commands and Majlis commands remain independently reproducible. All current test data includes the exact branch/base commit and execution date. No server-side secrets are needed.

## Evidence and documentation outputs

The app serves the source-controlled CBAR documents and generated diagrams. A separate evidence directory records baseline commands and logs. The main institutional PDF, executive brief and investor document will be produced from separate, source-controlled Markdown inputs using the Typst PDF workflow. Communication drafts remain separate from the investor brief and make no regulatory or endorsement claim.
