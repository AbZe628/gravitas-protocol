# Repository audit — 7 September 2026

Every figure below was measured in the repository, not recalled. Where something
is asserted without being checked, it says so.

This covers the whole repository. The Majlis handoff is separate and deeper:
`apps/majlis/docs/STATE.md`, and its §0 is the place to start on anything Majlis.

---

## What was found, and what was done about it

| Finding | State |
|---|---|
| `apps/web` had no tests and was not in CI, while the deploy publishes it on every push | **Fixed** — `8eeb860`, `521bd26` |
| Contract addresses hardcoded in 16 places across 7 files, including inside copyable code samples | **Fixed** — `8eeb860` |
| The V3 migration intent written out by hand in two functions, nothing checking they matched | **Fixed** — `521bd26` |
| `TOOLKIT.md` §8 still listed the citation question as open | **Fixed** — `ffec303` |
| Ownership has not moved to the timelock | **Open, by decision** — waits on the external audit |
| Slippage floor enforced on one side only | **Open** — see `KNOWN-ISSUES.md` |
| No external audit scheduled | **Open, needs the user** |
| Stage Three key management undecided | **Open, needs the user and the board** |
| `/classic/*` routes double-maintained | **Open, a decision** |

---

## 1. Majlis

**47,317 lines** · 46 services · 8 route modules · 23 pages · 36 components ·
**1,632 tests** (1,400 server, 232 client)

The most complete part of the repository and the only one with a test suite
proportionate to its size. Full detail in `apps/majlis/docs/STATE.md`.

**Built:** the way in (submissions, the `institution` role, the notice adapter),
deliberation and voting, 19 contract shapes with their conditions, six exact
calculations, the documents (ruling, draft clauses, manual, annual report,
per-holding, audit export, calendar), drift, examinations, the nine-step
incident path, review dates, three languages including the guide.

**Not built, and it is the product's own thesis:** Stage Three, where the vote
becomes the signature. Majlis records a decision; it does not change the Policy
Registry. What blocks it is not code but four answers about keys — succession,
prolonged absence, device loss, quorum change — which `ROADMAP.md` says must
exist before the first board is convened.

**Also open:** Stage Four (plurality; `boardId` is already everywhere),
`TOOLKIT.md` §8.1 (how often figures arrive) and §8.3 (profit distribution needs
a practitioner).

**Where simplification could still go:** `Coming` and `Record` appear both as
tabs and as entries under `More`, which is the only real duplication left in the
navigation. `/classic/*` keeps three screens in two versions — a good decision
when made, a maintenance cost now.

---

## 2. The protocol

**1,452 lines of Solidity** · 4 contracts live on Arbitrum Sepolia · 9 Foundry
test files · SDK of 5 modules

**The largest single item in the repository: ownership has not moved to the
timelock.** The registry owner is still the deployer, and it matters more than
it first reads — `onlyAuthorized` on the Teleport contracts short-circuits on
`msg.sender == owner()`, so the deployer's key can execute migrations without
the registry having any say. Handing over the registry alone would leave the
governance claim reading as satisfied while the engines still answered to one
key. `KNOWN-ISSUES.md` states this and why it waits.

Everything on chain queues behind the external audit: the handover, mainnet, and
publishing the SDK to npm.

**Not defects, though they read like them:** no asset is approved in the registry
(what the registry permits is a ruling, and the chain is correctly waiting on
people), and TeleportV2 has nothing to route through on Sepolia (no Uniswap V2
deployment there).

---

## 3. The marketing site

`site/` — 17 tracked files, static: index, legal, privacy, risk, terms.

`_pages/` is **not tracked** and is a build artefact of the deploy workflow. It
was checked for exactly this reason: two copies of a site in one repository is a
drift risk, and this is not one.

Nothing structural is missing.

---

## 4. `apps/web`

**3,695 lines of pages** · 53 shadcn components · 4 of the app's own · 8 routes ·
**14 tests, all added on 7 September**

Built to answer under `/app/`; the marketing site owns the root. Serving the
built bundle at `/` gives a blank page, which is a serving mistake and not a
fault — worth knowing before it is reported as a bug.

**What was wrong.** No CI job at all, while `deploy-frontend.yml` publishes on
every push that touches the app. 793 lines that assemble EIP-712 migrations and
spend a user's money reached production gated by nothing but a build succeeding.

**What is right now.** A `web` job runs typecheck, tests and build. The migration
intent is built once in `client/src/lib/migration.ts` and used by both the
signing and the executing path.

**Still open:** the lockfile was written on Windows and `npm ci` refuses to start
on Linux, so both CI and the deploy run `npm install` and production builds from
an unpinned graph. The fix is regenerating the lockfile on Linux and committing
it from there; both switch to `npm ci` on the same day.

---

## What to do next, in order

1. **Regenerate `apps/web/package-lock.json` on Linux.** Then switch CI and the
   deploy to `npm ci` together. Until then production is built unpinned.
2. **Schedule the external audit.** Everything on chain waits on it.
3. **Answer the four key-management questions** before any Stage Three code.
4. **Decide on `/classic/*`** — keep or retire.
5. **More tests for `apps/web`** if it grows. The 14 cover the money path; the
   rest of the app has none.

---

## Two things measured that turned out not to be faults

Recorded because the useful lesson is the habit, not the findings.

- The address literals looked like they might include superseded ones. They do
  not: every address in the app is one of the four that are live.
- `_pages/` looked like a second copy of the site that could drift from `site/`.
  It is not tracked, so it cannot.
