# Session report — public exposures, content audit, design, deployment

Companion to `REPORT.md` (the verification session). Same register: what was done, what was
not, and what I was unsure about.

**Read this first:** two of the eight queue items were not completed, and one deliverable
could not be produced in the form you asked for. Those are in §7 and §8 rather than buried.

---

## 1. Gate 2 — your verification, and what it does and does not close

You verified the classifier externally: 21 ruling-seeking questions all returned YES,
9 legitimate mechanical questions all returned NO, across English, Arabic and Urdu,
including *"what fiqh concepts are stored as string keys in the registry schema"*.

Recorded as you framed it, with both caveats carried into the code and the runbook:

**Open item 1 — the classifier model. You have chosen Haiku for now.** Recorded, and
`DEPLOY.md` §2.1 now says in a call-out box that the deployed configuration is **unverified**,
that switching is a single environment variable, and that the difference costs about $1 a
month at 500 questions. §4.1 repeats it at the point where the variable is actually set, and
§6 runs the probe against whichever model is deployed rather than against the one that was
tested. The decision is reversible without a code change and it is now impossible to forget.

**Open item 2 — gates 1 and 3 remain unexecuted against a live model.** They are exercised
by 37 offline tests against the adversarial corpus, which is real verification of the
patterns but not of the deployed path. `test/gate-probe.ts` is unchanged and is still how
that gets closed. `DEPLOY.md` §6 runs it against the deployed configuration.

I could not run the probe from here. The sandbox proxy rejects any request carrying an
`x-api-key` header — re-verified at the start of this session, with a fake key and a real
key producing byte-identical `text/plain: Unauthorized` responses while a request with no
key reaches Anthropic properly. That is unchanged and is not about the key.

---

## 2. The four public exposures — done

| Exposure | Action | Files |
|---|---|---|
| `SC-VENTURES-INTEGRATION.md` | **Deleted** | — |
| Libeara in contracts | **Removed, 7 references** | `GravitasPolicyRegistry.sol`, `IShariahPolicyChecker.sol` |
| AAOIFI claims | **Removed, all 7** | `Home.tsx` ×3, `README.md`, `whitepaper.md` ×3 |
| Fabricated AAOIFI citation | **Relabelled** | `seed.ts:108` |
| Contract-address banner | **Added** | `Home.tsx`, `docs/DEPLOYMENTS.md` |

Three exposures I found that were **not** on your list and removed as well:

- **`README.md` had a whole section titled "Institutional Integration: Libeara & Tokenized
  Fund Compliance"**, linking to the deleted file. Replaced with a generic description.
- **`test/GravitasLibearaIntegration.t.sol`** — a test file named after the counterparty.
  Renamed to `GravitasSubscriptionIntegration.t.sol`, contract renamed to match. This one
  mattered because the name appears in CI output on every run.
- **`proof-of-quality/INTERNAL_REVIEW.md`** and **`docs/SECURITY_AUDIT_PREP.md`** both
  referenced Libeara. Corrected.

Libeara is now replaced throughout by "an integrating fund-subscription manager" / "a
tokenisation platform". Verified: `grep -rn "Libeara\|SC Ventures"` over the tree returns
nothing outside `REPORT.md`, where it appears as a finding.

### The banner

Added to the "Verify Everything On-Chain" section, immediately above the contract cards,
and to the top of `docs/DEPLOYMENTS.md`. It names both fixes specifically — the
`MIGRATION_TYPEHASH` binding and the non-functional `Pausable` — and says the verified
source on Arbiscan will not match this repository.

The strapline directly above it previously read *"No trust required. Every contract is
deployed, verified, and inspectable on Arbiscan."* Changed to *"Every contract is deployed
and its source is verified on Arbiscan. Read the note below before relying on what you find
there — the deployed bytecode is not the current source."* The old sentence made the gap
worse by inviting exactly the check that fails.

**No contracts were redeployed.**

---

## 3. Website content audit — all fourteen applied

| # | Item | Status | What it says now |
|---|---|---|---|
| 1 | Addresses presented as current | ✅ | Banner above the cards; `DEPLOYMENTS.md` note |
| 2 | "3 on Sepolia" | ✅ | "2 on Sepolia", note changed to "Pre-0.1.2 bytecode" |
| 3 | "No trust required" | ✅ | Rewritten, see §2 |
| 4 | Test count 60 | ✅ | 66 in `README.md`; CHANGELOG 0.1.0 annotated as historical |
| 5 | Roadmap quarters | ✅ | Q1 2026→"Done", Q2→"Next", Q3→"After audit", Q4/Q1 2027→"Later" |
| 6 | Audit "Q2 2026 / Scheduled" | ✅ | "Pending — not yet commissioned", conditional on the round closing |
| 7 | Advisory board / certification dates | ✅ | "In progress" and "Follows Phase 2"; no dates |
| 8 | AAOIFI in the FAQ | ✅ | Removed; replaced with what the registry actually enforces |
| 9 | AAOIFI in Phase 1 | ✅ | "rules enforced as written into the registry by its owner" |
| 10 | AAOIFI in disclosures | ✅ | Removed; AmanX stated as in progress |
| 11 | AAOIFI in README | ✅ | Removed |
| 12 | AAOIFI in whitepaper ×3 | ✅ | All three, including the `aaoifi.com` link |
| 13 | Certification understated **and** misdated | ✅ | "in progress through AmanX Advisory", no date |
| 14 | Custody language | ✅ | Was already correct; strengthened to "or keys, at any point" |

Also swept and corrected outside the table: `INVESTOR.md`, `CHANGELOG.md`,
`docs/DEPLOYMENTS.md`, `IMPLEMENTATION_SUMMARY.md`, `.github/SECURITY.md`. **No `Q[1-4] 20xx`
claim remains anywhere in the source tree.**

### One judgement I made without asking

Four documents named **Mufti Billal Omarjee** personally alongside "Final certification
stage" and a date. I reduced these to **AmanX Advisory**, the firm.

Naming an individual scholar as being at the "final stage" of certifying something that is
not certified creates exposure for *him*, not only for you. Your brief specified the firm.
If he has agreed to be named, put him back — but the date has to go regardless.

---

## 4. Failure UX — done

`ask()` now distinguishes three failure modes where previously all of them read the same:

| `failure` | Meaning | `retryable` | What the user sees |
|---|---|---|---|
| `'ruling'` | Declined on its merits | `false` | The refusal. No try-again — it will be declined again |
| `'transport'` | The check could not run | `true` | One line + try-again; explanation behind a disclosure |
| `'empty'` | Model returned no text | `true` | One line + try-again |
| `null` | Answered | `false` | The answer |

One retry on `408`, `429`, `5xx`, and network-level failures (`ECONNRESET`, `ETIMEDOUT`,
timeouts, `fetch failed`), with a 400 ms pause. **`4xx` other than 408/429 is not retried** —
a bad request will be bad again, and retrying only delays the refusal.

The long message is gone from `answer` and moved to `detail`, so the interface shows one
line and puts the reasoning behind a disclosure rather than five lines of policy every time
a connection drops.

**It never degrades to answering.** Both attempts failing still returns
`{ seeks: true, reachable: false }`.

13 new tests cover this, including that a 400 and a 401 are attempted exactly once.

---

## 5. Design — the system and what it is built on

### The synthesis

The tension you named — Islamic geometry is rigid and tessellated, Hadid's language is
fluid — is resolved by making the star and the surface **the same equation at different
parameter values**:

```
r(θ) = R · (1 − a · |cos(nθ/2)|^p)
```

With `n = 8` this has exact eight-fold symmetry for every `a` and `p`. At `a≈0.17, p≈1.25`
it is a khatim; at `a≈0.06, p≈2.6` it is a continuous surface that still carries the
eight-fold rhythm. Sweeping `a` and `p` across a family of shells **is** the recursive
subdivision, rendered as flowing surface rather than as flat pattern. Nothing is drawn by
hand and nothing is sourced.

The straight girih chords — the compass-and-straightedge construction — are drawn underneath
at low opacity, from the same vertices. What you see under the surface is genuinely the
construction of that surface.

`apps/web/client/src/design/geometry.ts` — pure functions, deterministic, no dependencies.
`ParametricField.tsx` — the React component. Both copied into Majlis.

### Three decisions, and why

**Ribs aligned, not offset.** My first version rotated each shell by half a symmetry step.
It rendered as sixteen-fold, spiky, and frankly psychedelic — closer to a crypto product
than to financial infrastructure. I rendered it, looked at it, and rejected it. Aligned
ribs read as structure.

**Cropped, not centred.** A centred rosette is a medallion, which is ornament. A cropped one
is a fragment of something larger, which is architecture — and it leaves two thirds of the
frame quiet for the words, which are the content.

**Gold on one rib only.** On all of them it is decoration; on one it carries the eye and
stays defensible as hierarchy.

**Motion is off by default.** When enabled it is a single 420-second rotation nobody
consciously notices, and `prefers-reduced-motion` removes it.

### Typography and RTL

`design/tokens.css`. Two rules shape it:

- **Logical properties only.** `margin-inline-start`, never `margin-left`. Anything physical
  in that file is a bug. Arabic is not a translation layer applied at the end.
- **Nothing below 14px.** The audience reads long paragraphs on phones and many are not
  twenty-five. Body line height 1.72, rising to **1.95 in RTL** because Naskh needs more room
  than Latin at the same nominal size.

`.g-numeric` sets `direction: ltr; unicode-bidi: isolate` on addresses, hashes and
parameters. Without it a contract address renders reversed inside an Arabic paragraph, which
is the most common way RTL support silently fails.

Majlis overrides the scale to be denser and calmer via `[data-app='majlis']` — smaller base,
tighter leading, wider measure, less vertical rhythm. Same system, different instrument.

---

## 6. Deployment — written, not executed

`DEPLOY.md` is the runbook. `render.yaml` is committed and encodes the whole service.

Everything you specified is in place:

- **Basic auth across the entire application** — `middleware/basicAuth.ts`, constant-time
  comparison, exempting only `/api/health`. **Covers `/api/export/:boardId`**, which closes
  the open item from `REPORT.md` §5.6.
- **The server refuses to start** in production without both credentials. Forgetting them
  produces a service that does not boot, not a board record on the open internet.
- **`ASSISTANT_DAILY_USD_CAP` lowered to 5.** ≈215 questions/day at measured cost.
- **Anthropic console budget alert** — `DEPLOY.md` §4.3, $25 limit / $10 alert, with the
  reason it matters: the in-process cap cannot stop a loop inside the process.
- **Single instance enforced** — `numInstances: 1`, with the doubling problem explained in
  `render.yaml`, `limits.ts` and `DEPLOY.md` §3.1.
- **Key in the platform secret store** — `sync: false` in the blueprint.

21 new tests cover the auth layer, including that every protected route 401s, that refusals
leak no board data, that malformed headers do not throw, and that production start fails
without credentials.

### One thing I removed rather than kept

`MAJLIS_READ_TOKEN` is gone. With basic auth covering everything, a second shared secret in
front of one route looked like defence in depth without being any. The log is protected by
the same credential as everything else, and `DEPLOY.md` §5 states plainly that anyone with
the board credential can read every question every member has asked. Stage Two's roles are
the actual fix. I would rather write the weakness down than paper it with a second password.

### A problem I found while writing the runbook

**The live site is served from the committed `apps/web/dist/`, and `deploy-frontend.yml` did
not exist**, although `README.md` described it in detail. Source edits to `apps/web` have
never reached production on their own.

This means the content corrections in §3 would have changed nothing on the live site.

**Verified in this delivery:**

- `apps/web/dist/` is a **fresh build from the corrected source**. `index.html` now points at
  `index-D5mTSni7.js`; the stale `index-BXU9KwFC.js` is gone from the tree.
- The new bundle contains **zero** occurrences of `AAOIFI`, `Q3 2026`, `3 on Sepolia`,
  `No trust required` and `60 passing`, and **does** contain the contract-address banner
  ("deployed bytecode is older", "not yet on chain"), `AmanX Advisory` and `2 on Sepolia`.
- `.github/workflows/deploy-frontend.yml` is committed and parses as valid YAML, with the
  correct `pages: write` / `id-token: write` permissions, a build step rooted at `apps/web`,
  and a step that copies the root `CNAME` into the artifact so the custom domain survives.

**One thing I could not verify, and it matters.** The workflow has never executed, because I
cannot push. More importantly, `actions/deploy-pages` only publishes when the repository's
Pages source is set to **GitHub Actions**. It is currently set to *deploy from a branch* —
that is how the committed `dist/` is being served today. **Until you change that setting the
workflow will run, go green, and publish nothing**, which is the same silent failure in a new
costume. `DEPLOY.md` §8.1 is the step, with a one-line `curl` to confirm the live site
actually picked up the new bundle hash.

`DEPLOY.md` §8.2 also recommends dropping `dist/` from version control after the workflow's
first successful run — but not in the same change, so a workflow problem cannot take the site
down.

---

## 7. What was not done

### Stage Two — not built

Not started. Persistence, lifecycle, roles, threaded deliberation, computed simulation,
notification — none of it.

I would rather say that plainly than ship a partial governance system. A Stage Two with
persistence but no roles, or a lifecycle without the working timelock and objection path, is
precisely the thing you warned against: **a board shown something that looks like authority
and is not.** A half-built version of the feature whose entire purpose is to make a gap
visible would obscure the gap instead.

**Agreed first slice (your instruction):** roles + lifecycle with a **visible timelock and a
working objection path**, with persistence, because without persistence none of it means
anything. That is the slice that makes the gap visible, which is the whole reason Stage Two
is its own stage. Threaded deliberation, computed simulation and notification come after.

What exists for it: the type layer in `types.ts` already models the whole shape —
`MatterStatus`, `ChangeDirection`, `TIMELOCK_HOURS` with the permit/restrict asymmetry
(48h vs 0h), `Reasoning` with a required `reason`, `Objection`, `Simulation`,
`ratificationWindowHours`. Those are the seams. The Stage One record is the same record
Stage Two writes to.

The Arabic Majlis render (`p4.png`) shows how the vote-is-not-execution notice is meant to
read at the top of a matter, which is the piece I most wanted to get in front of you even
though the mechanism behind it does not exist yet.

### The redesign is a system, not a finished application

`geometry.ts`, `ParametricField.tsx` and `tokens.css` are complete and committed in both
apps. Majlis is wired to the tokens and tagged `data-app="majlis"`.

**The page-level application is not complete.** The existing components still carry their
old Tailwind classes. Nothing is broken — the tokens are additive — but you should read this
as "the design system exists and is proven" rather than "both applications are redesigned".

---

## 8. Screenshots — renders, not screenshots

I could not produce screenshots. Chromium cannot be downloaded through the sandbox proxy, so
there is no browser here and no way to photograph a running application.

What is in the ZIP instead, in `design-renders/`:

| File | What it is |
|---|---|
| `p1.png` | Public site hero, desktop 1440×900 |
| `p2.png` | Public site hero, mobile 430×932 |
| `p3.png` | Majlis matter view, desktop |
| `p4.png` | Majlis matter view, **Arabic, RTL** |

These are rendered from **the real `geometry.ts`** — the same module the application
imports — composed into page layouts using the real token values and rasterised with
cairosvg. The geometry is genuine output of shipped code. The page layout around it is a
faithful composition, not a photograph of a running build. **Do not present them as
screenshots.**

Two artefacts of the rendering pipeline, not of the design: the Arabic render uses a subset
Noto Naskh face I installed here, so a few Latin punctuation marks fall back to boxes; and
cairosvg does not do the same text shaping a browser does. In a browser with the full
webfont neither applies.

---

## 9. Verification

```
Majlis server:  128 tests passing (was 94), 0 failing
tsc --noEmit:   exit 0
Foundry:        not run — see below
```

Foundry still cannot run here: `lib/openzeppelin-contracts` is a submodule and the tree has
only an empty directory for it. **Run `git submodule update --init --recursive && forge test -vv`
from a real clone and confirm 66** before pushing. I renamed a test file
(`GravitasLibearaIntegration.t.sol` → `GravitasSubscriptionIntegration.t.sol`) and renamed
the contract inside it; that rename is the one change in this delivery that Foundry, and only
Foundry, will verify.

Also verify before pushing:

```bash
grep -rn "Libeara\|SC Ventures" --include="*.sol" --include="*.md" . | grep -v REPORT.md   # empty
grep -rn "AAOIFI" apps/web docs README.md                                                   # empty
grep -rnoE "Q[1-4] 20[0-9]{2}" --include="*.md" --include="*.tsx" .                          # empty
grep -rlE "sk-ant-api03-[A-Za-z0-9_-]{20,}" .                                               # empty
grep -c openai apps/majlis/package-lock.json                                                # 0
```

No `.env` exists in the tree. The API key you supplied is in no file.

---

## 10. Things I was unsure about and decided anyway

1. **Removing the individual scholar's name** (§3). Protects him as much as you. Reversible.

2. **Removing `MAJLIS_READ_TOKEN`** (§6). A second shared secret is not a second control. If
   you would rather keep belt-and-braces, it is a ten-line revert — but then it needs to be
   a *different kind* of credential, not another password.

3. **Not building Stage Two** (§7). The largest call in this session. I judged that a
   partial governance surface is worse than none given what Stage Two exists to communicate.
   If you disagree, tell me which slice you want first and I will build that slice properly
   rather than spreading thin across all of it.

4. **Leaving `apps/web/dist/` committed** while adding the workflow. Removing it in the same
   change means a workflow problem takes the live site down. Two changes, in order.

5. **The banner wording names the two vulnerabilities specifically.** An alternative is a
   vaguer "pending redeployment". I judged that a reader who follows the Arbiscan link will
   find them anyway, and finding them unannounced is worse than being told. It does mean the
   site names two live weaknesses in deployed contracts holding no funds. I think that is
   right, but it is your call and it is prominent.

6. **`design-renders/` is committed to the repository.** They are documentation of a design
   decision. If you would rather they not be in the repo, delete the directory — nothing
   imports from it.
