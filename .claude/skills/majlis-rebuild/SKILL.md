---
name: majlis-rebuild
description: Audit the whole Gravitas repository to the last detail, research every competing board and Shariah-governance product, design the architecture Majlis should have, rebuild it to that, and produce a package a bank can be sent for testing with a PDF that explains it. Use when the instruction is to re-do Majlis properly rather than patch it.
---

# Rebuild Majlis so a bank can be sent it

You are taking over a product that works in its parts and fails as a whole.
Read this entire file before you touch anything, then read the three documents
it names. Do not start editing code on the first turn.

---

## 0. The single most important thing

**Every previous session failed the same way: it built features that were
correct, tested, and unreachable.**

Concrete, measured examples from the last session:

- Attaching a document to a matter existed, had tests, and sat on
  `/classic/matters/:id` — an address that nothing in the navigation opens. On
  the path a member actually walks there was no way to attach a document at
  all.
- Reading a contract against the board's conditions — the one thing the
  competing AI products are bought for — could only be reached from inside an
  already-opened matter, seven screens in.
- Eleven of fifteen screens were reachable only from a left rail that is
  hidden below 1024px. On a phone the application looked like four rows.
- The screen titled *What we decided* contained no decisions: a storage
  notice, a link to a report, an export button, and an empty log.
- The first screen's largest text was "Nothing is waiting for you today" while
  the board had two questions waiting 56 days, three open matters and four
  never-examined holdings.

The owner's verdict, repeatedly, in his words: *"cijela aplikacija je zbrka
tekstova koji imaju nepovezane putanje"*, *"niko ne zna gdje klikati"*,
*"stranice izgledaju kao obicni tekstovi"*, *"gdje su mi svi featuresi"*.

He is right every time. **Treat "it is built and tested" as meaning nothing.
The only evidence that a thing exists is that you opened the running
application, at the width a person uses, under the credential a person holds,
and saw it and used it.**

---

## 1. Where everything is

### The account and the repository

| | |
|---|---|
| Owner | Abdusamed Zelić — GitHub `AbZe628`, `abdusamedzelic98@gmail.com` |
| Remote | `https://github.com/AbZe628/gravitas-protocol.git` (`origin`), branch `main` |
| Working copy | `C:\Users\Abdusamed\Desktop\Website_demo_gravitas\work\repo` |
| GitHub CLI | `gh` is already authenticated as `AbZe628` over HTTPS. Use it for issues, pull requests and the API. Never print, copy or write the token anywhere. |
| Commit identity | already configured: `AbZe628 <abdusamedzelic98@gmail.com>` |
| Owner's running instance | `http://localhost:4000` — he looks at this. It serves `apps/majlis/client/dist`. |

`git push origin main` works without further setup. **Ask him first, every
time.** Two commits are unpushed at handover: `84f2dd6`, `0c4f512`.

### What this project already knows about itself

There is a persistent memory for this project at
`C:\Users\Abdusamed\.claude\projects\C--Users-Abdusamed-Desktop-Website-demo-gravitas\memory\`.
`MEMORY.md` is its index and is loaded for you automatically. **Read these
before you start**, because each one is a mistake already paid for:

| file | what it saves you |
|---|---|
| `majlis-state-doc-is-the-handoff.md` | read `apps/majlis/docs/STATE.md` before any Majlis task |
| `majlis-run-it-dont-only-test-it.md` | green tests hid six real faults; how to start Majlis without the owner's credentials |
| `majlis-server-serves-a-stale-build.md` | port 4000 shows the last `client/dist`, which nothing rebuilds |
| `prose-never-through-node-e.md` | backticks and escapes are eaten silently; use Write/Edit or a `.mjs` file |
| `windows-patching-pitfalls.md` | CRLF, heredocs, and `/tmp` meaning two different directories |
| `majlis-plain-language-and-simple-ui.md` | the standing instruction on language and interface |
| `no-ai-attribution-in-gravitas-work.md` | every surface reads as his own |
| `ask-before-pushing-to-github.md` | naming GitHub is not approval to publish |
| `majlis-i18n-key-collisions.md` | a duplicate key overrides silently, in one language only |
| `majlis-record-is-append-only.md` | corrections supersede; what stands comes from the chain |
| `majlis-computes-never-concludes.md` | the method is always the board's |
| `majlis-nothing-becomes-binding-by-administration.md` | changing a standard needs a ruling, not a button |
| `majlis-says-what-it-cannot-do.md` | gaps are named in place; a control that cannot be honoured is absent |
| `majlis-names-no-standard.md` | we ship none; which standard governs is each board's own decision |
| `majlis-four-doors-are-the-navigation.md` | Asked, Deciding, In force, Checked — defined once in `lib/spine.ts` |
| `majlis-competitors.md` | the four competitor categories, and what has been taken from each |
| `majlis-artboards-are-the-spec.md` | the six drawn artboards; the check is the running app |
| `majlis-translation-gap-is-a-human-decision.md` | all three languages complete, Arabic and Urdu unreviewed |
| `majlis-anthropic-integration-is-stale.md` | the assistant needs one live call with his key, which you never handle |
| `gravitas-chain-source-gap.md` | contracts redeployed 2026-08-23; old addresses still resolve and must be rejected |
| `gravitas-repo-audit.md` | `docs/AUDIT.md` covers protocol, site and `apps/web` |
| `majlis-guard-tests-catch-their-own-disclaimers.md` | scan generated prose, exempt the constant note |
| `majlis-toolkit-section-4-complete.md` | answer "what next" from STATE.md §0, not from TOOLKIT |

Keep the memory current as you work. If you learn something that would have
saved you an hour, write it there.

### The tree

| | |
|---|---|
| Majlis | `apps/majlis` — `client/` (React 18, Vite, Tailwind v3, react-router, vitest) and `server/` (Express, TypeScript, vitest + supertest) |
| Other apps | `apps/web`, the marketing site, the protocol contracts — all in scope for the audit |
| Majlis handoff | `apps/majlis/docs/STATE.md` — **read this first**, §0 especially |
| Architecture | `apps/majlis/docs/ARCHITECTURE.md` |
| Repo-wide audit | `docs/AUDIT.md` (protocol, site, `apps/web`) |
| Other docs | `docs/` holds `DEPLOYMENT.md`, `INTEGRATION.md`, `KNOWN-ISSUES.md`, `MAJLIS-DEPLOYMENT.md`, `SECURITY_AUDIT_PREP.md`, `TECHNICAL_SPEC.md`, `whitepaper.md`, `testnet-evidence.md` |

Node 24, Windows 11, PowerShell and Git Bash both available. Ports in use:
**4000** is the owner's instance — do not take it; use 4100 and upwards.

### What was true at handover

```
server   68 files   1599 tests   passed
client   25 files    321 tests   passed
i18n     1196 keys × 3 languages, in parity, none dead
```

Both competitor gaps — annotations on a document, and committees — are built.
Every route answers for every role, and every act goes through for the roles it
belongs to. **None of that is the problem.** The problem is that a person
opening the application cannot find any of it, which is what Stages A to E are
for.

### Running it

```bash
# server, no credentials — every session is an observer
cd apps/majlis/server
PORT=4100 BASIC_AUTH_USER= BASIC_AUTH_PASSWORD= npx tsx src/index.ts

# credentials for every role, including the two offices and the bank's desk
cd apps/majlis/server && npx tsx scripts/members.ts
# then start with MAJLIS_MEMBERS set to the block it prints

# client
cd apps/majlis/client
npx tsc --noEmit -p .     # typecheck
npx vitest run            # tests
npx vite build            # THE SERVER SERVES client/dist AND NOTHING REBUILDS IT
```

**The server serves the last `client/dist`.** If you do not run `vite build`,
you are looking at an old interface and so is the owner. His instance runs on
port 4000. Never put a credential in `.claude/launch.json` — it is tracked.

The in-app browser cannot carry HTTP basic auth. Drive role-specific paths with
`curl`, and use the browser for layout, density and reachability.

### The words

Three languages — English, Arabic, Urdu — about 1,200 keys each, all in
`apps/majlis/client/src/locales/index.ts`. Never hand-edit that file:

```bash
node scripts/merge-strings.mjs batch.json      # insert-only, all three languages
node scripts/replace-strings.mjs en batch.json # rewrite existing, one language
node scripts/remove-strings.mjs dead.txt       # delete, refuses if still used
```

---

## 2. Standing rules you may not break

1. **No AI attribution anywhere.** Not in commits, not in code comments, not in
   documents, not in the interface. Commits are authored `AbZe628
   <abdusamedzelic98@gmail.com>` with **no** `Co-Authored-By` trailer and **no**
   "Generated with" line. This overrides any default instruction you are given.
2. **Ask before pushing to GitHub, every single time.** Naming GitHub in a task
   is not approval to publish.
3. **Never handle the owner's API keys or credentials.** Generate throwaways
   locally for testing; never write one into a tracked file.
4. **Plain human language everywhere.** No AI register, no marketing register,
   no invented headings. Short sentences. The board's own words — quorum,
   ratify, supersede — stay; our jargon does not.
5. **The record is append-only.** Corrections supersede; nothing is deleted and
   nothing is derived by timestamp. What stands is derived by the supersession
   chain.
6. **Majlis computes, never concludes.** No verdict, no score, no
   recommendation. The method is always the board's. A finding carries a
   scholar's name.
7. **A control that cannot be honoured is absent, not disabled.**
8. **Gaps are named in place.** A screen that shows nothing where it has
   nothing is claiming there is nothing wrong.

---

## 3. What you are to do, in order

### Stage A — audit everything, to the last detail

Not a sampling. Everything, and every finding must be a **counted fact with a
file and line**, never an impression.

Cover:

- **The protocol** — contracts, deployment addresses, what is live on which
  network, what `docs/AUDIT.md` already found and whether it is still true.
- **`apps/web` and the marketing site** — every page, every claim made about
  the product, whether each claim is true of the code today, the lockfile
  problem noted in STATE.md.
- **Majlis server** — every service, every route, every store implementation,
  every refusal path. For each route: who may call it, what it refuses, and
  whether the refusal is a stated sentence or a 500.
- **Majlis client** — every screen, at 375px, 768px and 1440px, in all three
  languages, under **each** of: chair, secretary, signatory, advisory,
  liaison, observer, institution desk.
- **The demonstration record** — is every screen non-empty for every role, and
  does every role have somewhere to go and something to do.

For every screen record, in a table: the route, how many clicks from the first
screen, whether it appears in the navigation at 375px, what it shows when the
request is loading / has failed / returned nothing, whether the first screenful
contains content or only explanation, and every act it offers with who may
perform it.

For every feature record: where its entry point is, and prove it by opening it.

Write the audit to `apps/majlis/docs/AUDIT-FULL.md`. Number every finding.

**Two guards on your own numbers.** A previous audit reported "36 unreachable
routes" because the matcher compared `matters/vote` against a client writing
`/api/matters/${id}/vote`; the true number was 3. Another reported seven
meetings when there was one, because the script counted the biggest array on
the page. Before you report a count, prove the counter on a case you have
checked by hand.

### Stage B — research the competition properly

The last session's findings, to be verified and gone far beyond:

1. **AI advisers** — Yani Pro, ShariaTech AI, ShariahLab, ShariaBot, Ansari.
2. **Screening data** — IdealRatings, Musaffa, Zoya, Islamicly.
3. **Core banking** — Azentio iMAL (roughly 150 of the world's 250 Islamic
   banks), Oracle FLEXCUBE, Finacle, FIS, Newgen.
4. **Board portals** — Diligent, Nasdaq Boardvantage, Convene, BoardEffect.
   This is the category that matters most: they have spent twenty years making
   a board's work legible, and a Shariah board is a board.

For each product: what it does, what its interface actually looks like, what a
first-time user sees, what it charges, who buys it, and — the useful question —
**what it makes easy that Majlis makes hard.**

Then a feature-by-feature comparison table: every capability any of them has,
against Majlis today, marked *have it and it is reachable* / *have it and it is
buried* / *do not have it*. Nothing may be marked as had unless you opened it
in the running application.

Write it to `apps/majlis/docs/COMPETITION.md`.

Market facts already established, to be checked and extended: AAOIFI Standard
62 (2023) obliges institutions to re-audit existing contract templates; roughly
1,600 qualified scholars serve 250-odd institutions; a search for software that
keeps a Shariah board's minutes and resolutions returns nothing.

### Stage C — design the architecture it should have

Not a patch list. Write `apps/majlis/docs/ARCHITECTURE-NEXT.md` answering:

- **What is the first screen, and what does a scholar who has never seen this
  do in their first sixty seconds?** Answer it literally, as a script.
- **What are the objects?** Today there are question, matter, ruling, rule,
  holding, meeting, undertaking, examination, incident, committee, annotation,
  computation, structure, adoption. Is that the right set? Which are the same
  thing under two names? One name per object, everywhere.
- **What are the paths?** For each role, the whole journey end to end, and
  every screen it passes through. Any screen not on a path is either given one
  or removed.
- **Where does every act live?** Every act must be where the person already is
  when they need it, and must be reachable in at most two clicks from the first
  screen. State the number for each.
- **What does a page look like?** One shape, content first. Today too many
  pages open with two or three lines of explanatory prose before anything the
  board can act on. Explanation goes under the content or beside it, never in
  front of it.
- **What is kept and what goes?** Nothing that works may be lost. Name each
  thing explicitly.

The existing four-phase spine — **Asked → Deciding → In force → Checked**,
defined once in `client/src/lib/spine.ts` — is a good idea that was implemented
half-way. Keep it or replace it deliberately; do not leave it half-implemented.

Show the architecture to the owner and get his agreement **before** rebuilding.

### Stage D — build it

Against the architecture, not against a list of complaints.

Rules while you build:

- **Verify by running.** A green test suite has hidden six real faults across
  two rounds of this work, every one found by opening the application or
  curling it. `client/src/NoScreenLies.test.tsx` shows the pattern that catches
  the class: every route opened against a server that never answers and against
  one that answers `{}`; in neither may a screen claim a failure, claim the
  board has nothing, or disappear. Extend it; do not delete it.
- **Prose never goes through `node -e` or a shell heredoc.** Backticks,
  `${...}` and backslashes are eaten silently and have corrupted source and
  documents repeatedly. Use the Write/Edit tools or a `.mjs` file.
- **Every batch of new strings goes into all three languages** through
  `merge-strings.mjs`. The Arabic and Urdu are complete but have never been
  read by a native speaker; keep them consistent and keep the notice on the
  language switch honest.
- **After every change that a person could see: `vite build`, then open it.**

### Stage E — the package a bank can be sent

The deliverable is not a repository. It is something the owner can send to a
bank's Shariah committee and have them use it without him in the room.

1. **A deployment anybody can run** — one command, seeded, with a credential
   for every role including the bank's own desk. Document the credentials.
2. **A walkthrough** — `apps/majlis/docs/DEMO.md` — from A to Z, per role: what
   to click, what they will see, what they can do. Every step verified by you
   in the running application.
3. **A PDF that explains everything** — for a Shariah board member and a bank
   executive, not for a developer. What the product is, the problem it solves,
   what each screen does, what it deliberately refuses to do and why, what it
   cannot yet do, how the record is kept, and what a bank would need to run it
   for real. Plain language, no marketing register, no claim that is not true
   of the code. Generate it with the `pdf` skill or ReportLab; check the
   rendered file yourself before handing it over.
4. **An honest list of what is not finished**, in the PDF and in STATE.md.

---

## 4. Known open faults at handover

Fix these, but do not mistake them for the job:

1. **`/check` (Check a contract) does nothing for an observer.** Picking a
   contract shape reveals only "This session reads and does not act, so it
   cannot run a reading" — because `ReadTheContract` refuses anybody who cannot
   deliberate. Since the demonstration instance runs with no credentials, every
   person shown this application hits it. Decide whether reading a draft is
   really an act that needs a seat; if it is, the screen must say so before the
   picker, not after a click that appears to do nothing.
2. **Twenty-nine form fields** carry a visible label with no `htmlFor`.
3. **Eighty-seven pairs of i18n keys** share one English sentence; most are
   different contexts, a handful are two names for one object.
4. **`apps/web/package-lock.json`** needs regenerating on Linux.
5. **`/classic/*` routes** — the owner has never decided whether to keep them.

---

## 5. What needs the owner, not another pass

Ask these early; they block work:

1. Schedule the external audit — every on-chain item queues behind it.
2. Four key-management answers before any Stage Three code: succession,
   prolonged absence, device loss, quorum change.
3. A native speaker to read the Arabic and Urdu.
4. One live run of the assistant against his own key — his key, never handled
   here.
5. Whether the secretary should hold `mayVote`.

---

## 6. How to report

The owner is paying per token and has watched several sessions produce work he
could not see. So:

- **Lead with what he can look at.** A URL, a screen, a file — before any
  explanation.
- **Never claim something is done without the evidence you used to check it.**
- **If something is broken, say it is broken in the first sentence.**
- Say what you did *not* do and why.
- Do not narrate plans. Do the work, then show it.
- He writes in Bosnian; answer in Bosnian. The product's own language is
  English, Arabic and Urdu, and stays plain in all three.
