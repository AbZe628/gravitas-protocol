# Where Majlis stands

Last written **6 September 2026, evening**. Read this first, and read §0 before
anything else — it is written so that picking the work back up costs a few
minutes rather than an hour of re-reading the codebase.

Everything below is what is *true*, not what is planned. Where something is
unfinished it says so, and where something is broken it says how it breaks.

---

## Verified, this save

```
server   55 files   1400 tests   passed
client   21 files    232 tests   passed
```

`npm test` from `apps/majlis`. Typecheck clean with `--force` on both sides.
`client/dist` is rebuilt, so port 4000 shows the current interface.

Pushed to `origin/main` through `4f8c4b1`, on the user's explicit say-so each
time. **Pushing needs asking first, every time** — naming GitHub in a task is
not approval to publish.

---

## §0. Where we stopped, and what to do next

### All four things the user asked for are built

Written 7 September 2026. The three gaps this section used to describe as *not
started* are closed, and the fourth — simplification — has had its first pass.

| | |
|---|---|
| `b819009` | **Majlis follows no standard.** 107 citations out of the library, `authority` gone from both types, and screening's hardcoded 30/30/5 thresholds replaced by limits the board sets. See below. |
| `a8040c5` | **A way in, on the server.** `Submission`, the fifth role `institution`, and a notice adapter whose default sends nothing. |
| `00c93c1` | **A way in, on screen.** Two screens chosen by credential: the board works a queue, the institution puts a question and reads its own. |
| `d5930e1` | **Contract drafts.** Assembled from the ruling — findings, terms, exclusions — and nothing composed. `/api/matters/:id/contract`. |
| `d2efbbe` | **The matter screen.** The act moved from 96% of scroll depth to 17%; previous findings moved under the condition each answers; the reasoning collapsed in place. |

**What is left of the simplification.** One pass is done on the densest screen.
Whether the rest is right is a judgement that wants fresh eyes rather than
another sweep — `/more` was measured (11 destinations, 4 groups, 195 words) and
deliberately left alone, because its subtitles are what tell a scholar what
*Register* or *Events* mean and the instruction was to simplify without losing
anything.

**Two things measured that turned out not to be faults.** The two condition
lists on the matter screen looked like 83% duplication; they were the same six
conditions saying different things, so folding them improved *where* a scholar
reads rather than how much. And a label extracting as
`OPERATIVE TERMminTangibleRatioBps` has an 8px margin and renders correctly —
it is a text-extraction artefact. Measure before changing.

**Still open, and both need a person rather than another pass:** the assistant
has never met a real key, and the Arabic and Urdu are complete but unreviewed.

### Examinations, and the guide for banks

**`d45523a` / `2923887` — what was executed, against what was approved.** Added
after researching how Shariah boards actually work, which named the gap in its
own words: the distance between the approved structure in the fatwa and the
executed transactions is the commonest source of compliance failure, and it is
found only through ongoing audit. Majlis held the ruling and not the comparison,
and the annual report said so.

An examination records the period, **how the sample was chosen**, how many
transactions there were and how many were looked at, and one finding per
condition and per operative term. Three refusals define it: it does not choose
the sample, it reaches no verdict, and it reports coverage as unknown where the
institution never said how many transactions there were. A signatory cannot
record one — it is the institution's own review function reporting to the board,
so the secretary or the liaison does, like every other institutional step.

The annual report's gap about the audit function is now **conditional** and
disappears once a year has one.

**`4f8c4b1` — `docs/MAJLIS-GUIDE.html` and its PDF.** Ten A4 pages for a bank:
roles, navigation, the eight steps a question takes, what happens after a
ruling, the calculations, the documents, chain and no chain, what Majlis will
not do, what is not finished, and a fifteen-minute path to try it. Average
sentence 11.7 words, no em dashes — measured, not judged by ear. Rebuild it the
same way as the two-page brief, with the fonts inlined from
`scratchpad/fonts-min.css` or re-fetched.

**Accounts are described in the guide and never included in it.** Generate them
with `npm run members -w server`, which prints once and writes nothing to disk.

**The guide now answers in the language it was asked in** (`21314e7`). The
terms and the refusal already worked in three scripts; the eighteen answers
were the half left behind, and the English was rewritten rather than merely
translated from, because it carried the register the interface strings had just
been cleaned of.

**Closed rather than done: no further artboards.** Thirteen screens have none.
Asked on 7 September whether to draw them, the user ruled that an artboard is
not shown in Majlis and so does not earn the work. The check for an undrawn
screen is the running application, read directly. Do not offer to draw more.

---

### The standards detachment, in detail

**`b819009` — Majlis follows no standard, and no longer says it does.**

The trigger was the user seeing *AAOIFI Shariah Standard No. 17* printed on a
matter screen as the authority a board was judging against, and saying: *"mi
nismo AAOIFI niti bilo koji standard, to odlučuje board svake banke zasebno"* —
we are not AAOIFI or any standard; each bank's board decides that.

They were right, and it went deeper than the label:

- **107 citations** were removed from `server/src/data/structures.ts`, and the
  `authority` field is gone from both `Structure` and `StructureCondition`.
- **`services/screening.ts` shipped the thresholds themselves** — 30% / 30% / 5%
  hardcoded, with a standard named beside each. That was the product making the
  board's ruling, invisibly: a scholar reading *within the threshold* had no way
  to ask whose threshold it was. The limits now arrive from the board in
  `Figures.thresholds`, there is no fallback, and a ratio sent without one comes
  back computed in full but **untested**, carrying
  `unknownBecause: 'no_limit_set'`.
- `unknownBecause` distinguishes two silences that used to look identical:
  `'denominator_is_zero'` (the figures could not divide) and `'no_limit_set'`
  (the board has not ruled). An interface that renders both as "—" tells a
  reader their figures were rejected when the board simply has not decided.
- **The one place a standard is ever named** is `AdoptedStructure.basis` — the
  board's own words, on its own adoption. AAOIFI, a supervisor's circular, or
  "our own view, minuted 12 March" are equally valid, because the board is the
  one being asked. It threads through `services/structure.ts` (`Checklist.basis`),
  `services/adoption.ts` (`Effective.adoption`), and `services/fatwa.ts`
  (`Fatwa.structure.basis`, printed in the signed document).
- Where the board has said nothing, every surface **says it has said nothing**
  (`adopt.noBasis`) rather than leaving a blank line — a blank where a citation
  used to sit reads as a citation that failed to load.
- A board's own **evidence** may still cite anything it likes. That was never
  the problem, and a test in `test/fatwa.test.ts` is deliberately narrowed to
  the structure section to keep it possible.

Verified on the running page, not just in tests: `AAOIFI: 0`, `SS n: 0`,
`Standard No.: 0`, and the honest line present once.

### What was asked for, in the user's own words

**All three are built** — see the table above. The wording is kept verbatim
because it is what the work was held to, and what follows describes what was
found in the code at the time, which is still the best account of why each
mattered.

> *"nema opet funkcija puta kako smo zamisli ko salje prijedloge u majlis kako
> banka salje notifikacija memberima otvaranje"*

> *"nema primjera ugovora da se automatski stvaraju kad im treba nista"* …
> *"mi treba da imamo ugovore da ih se moze automatski generirati ali ne
> kacimo se za nkakve standarde"*

> *"opet je prenatrpano opet previse komplicirano treba to jos pojednostaviti
> bez da se ista gubi"*

**1. The path into Majlis. Nothing exists.** This was checked in the code, not
assumed:

- `POST /api/matters` (`routes/governance.ts:246`) requires a logged-in board
  member — `mayOpenMatter` is `mayDeliberate`, i.e. signatory, advisory or
  liaison. An institution has no way in at all.
- `MatterOrigin` includes `'institution_request'`, but it is only a **label
  somebody on the board types on the institution's behalf**. There is no request
  object, no queue, no record of the asker's own words.
- **Notification does not exist anywhere.** `grep -rni notif server/src client/src`
  returns six hits and every one is a comment explaining why something is *not*
  a notification. `services/attention.ts` deliberately derives what awaits you
  from the record rather than storing a queue, and its header says why: a second
  copy of the truth drifts. That design is right and should not be undone —
  what is missing is telling a member *outside* the app that something arrived.
- `ROADMAP.md` lists notification under Stage Two. It was never built.

**2. Contract drafts.** Nothing generates one. The material is all present and
already linked — the chosen shape, its conditions, the operative terms the board
set, the findings, the ruling — which is why this is a real feature rather than
a word processor.

**3. Simplifying the interface.** Touches every screen, so it goes last. What
was actually looked at this session: `/` is clean; `/more` carries **11 entries
in 4 groups**, each with a sentence of description, and duplicates two tabs
(Coming, Record); `/matters/:id` is very long — read its full page text before
touching it, it is the densest screen in the product.

### The three decisions, and which way each was taken

Put to the user as a question card; they dismissed it without answering and
asked for a save instead. On the next run the recommendation was taken in each
case and the choice was stated plainly rather than re-asked — which is the right
handling when someone has already declined to arbitrate. **All three are now
built as described below**, so this table is the record of why, not a pending
decision.

| Question | The recommendation, and why |
|---|---|
| **Who sends a request in?** | A fifth role, `institution`. Someone at the bank holds a credential, may submit a request and read the outcome of *their own* requests, and nothing else. This is safe by construction: every `may*` function in `auth/members.ts` tests role equality, so a new role is refused everywhere until it is explicitly allowed. It makes `institution_request` mean something. The alternative — the secretary records what arrived by email, "on behalf of" — is smaller and more honest about what Majlis can receive, and `mayRecordInstitutionAct` (secretary or liaison) already exists for it. Doing both is the complete answer. |
| **How are members told?** | An adapter, exactly like enforcement: `NoticeKind = 'none' \| 'smtp' \| …`, default `none`. Unconfigured, the screen composes the notice, offers it to copy, and says plainly that Majlis does not send it. Configured, it sends and says to whom. This is the pattern already established by `services/enforcement.ts` and `components/WhereItEnds.tsx`, it matches "Majlis says what it cannot do", and it never lies. **Never wire real SMTP without the user's own credentials, which are never to be handled here.** |
| **What generates a contract draft?** | Assemble it from the record: the adopted shape, the conditions and the board's findings on each, the operative terms with their `meaning`, and what was held outside the question. Every clause traces to something a member wrote. Where the board said nothing, the draft carries a **named gap** rather than boilerplate — the same rule as everywhere else. It must name no standard. If the user can supply real contract documents from the bank, that beats a generated skeleton for real use, but blocks on them sending files. |

### The order it was done in, and why it held

1. **The path in** — the biggest gap and the one named first. Server first:
   type, store, service, routes, tests; then the screens.
2. **Contract drafts** — reused `services/fatwa.ts` almost exactly in shape
   (assemble from the record, render, refuse when the matter is not settled).
3. **Simplify** — last, because it moves whatever the first two add. It did:
   the matter screen had to be re-ordered around the queue-fed matters and the
   inherited findings that arrived with them.

### Where the new pieces live

```
server/src/types.ts                    Submission, Disposition
server/src/services/submission.ts      the lifecycle: submit, open, decline, withdraw
server/src/services/notice.ts          the adapter; default sends nothing
server/src/services/contract.ts        assemble + render draft clauses
server/src/routes/submissions.ts       POST /api/submissions and its four acts
server/src/auth/members.ts             the fifth role, maySubmit, mayDisposeOfSubmission
client/src/pages/Ask.tsx               the institution's own screen
client/src/pages/Questions.tsx         the board's queue
client/src/components/TheNotice.tsx    says MAJLIS HAS NOT SENT THIS, then the words
client/scripts/merge-strings.mjs       insert-only string merge, all three languages
```

---

## 1. The backend

### Complete and tested

Every calculation in `TOOLKIT.md` §4 is built, server-side and on screen. Exact
decimal `BigInt` arithmetic throughout, `SCALE = 8`, one division at the end of
each formula so rounding happens once.

| service | what it does | the rule it refuses to break |
|---|---|---|
| `services/screening.ts` | the three ratios | the board sets every limit; there is no shipped one to fall back to |
| `services/purification.ts` | income to be given away | — |
| `services/sarf.ts` | SS-1 exchange | both legs in the same session or nothing |
| `services/tradability.ts` | SS-59 / SS-17 bands | refuses overlapping bands: *choosing between them is a ruling* |
| `services/late.ts` | SS-3 late payment | `NOT_INCOME`; retention is `nothing` or `evidenced_costs` |
| `services/clocks.ts` | what is running out | derived from `arrivedAt`, never stored |
| `services/passage.ts` | the order of work | `shaping` is a set, `deciding` is a sequence; only `deliberation` is `enforced` |
| `services/carrying.ts` | when terms get checked | **deliberately not a model call**; doubt goes in `limits` |
| `services/inherit.ts` | precedent from settled matters | proposals never findings; own board only; same `structureId` |
| `services/guide.ts` | the in-app guide | 18 topics; the ruling gate runs **first and without exception** |
| `services/dictation.ts` | speech to text | off by default, because the browser sends audio away |
| `src/env.ts` | loads `.env` | its own module, because ESM imports hoist above `dotenv.config()` |

### The assistant, which could not have answered anything — fixed

`thinking: { type: 'enabled', budget_tokens: 1536 }` is **rejected** by every
current model: a 400, not a warning and not a degraded answer. The parameter is
deprecated on 4.6 and refused on everything after it, so the call had been dead
for as long as the models it was written against have been superseded — and
1,300 tests passed the whole time, because a stubbed client accepts anything.

Fixed 6 September 2026:

- **SDK 0.65.0 → 0.124.0.** The older one has no type for `adaptive`, so the
  upgrade had to come first. Nothing else needed changing for it: the server
  typechecks and every test passes against the new one untouched.
- **Adaptive thinking.** Better shaped than what it replaces — a fixed budget
  spends the same on a definition and on an edge case.
- **`max_tokens` 4,096 → 8,192**, because adaptive draws its reasoning from
  inside the ceiling, and an answer squeezed out by it is reported here as a
  *transport* failure — a fault that looks like the network rather than a
  setting.
- **Three model defaults** were a generation behind: assistant, extraction, and
  `.env.example`, which had drifted behind the code and was missing
  `EXTRACTION_MODEL` entirely. All on `claude-opus-5`. The classifier stays on
  Haiku 4.5 by its full id — the small model in the current family is not an
  old model.
- **`test/request-shape.test.ts`** asserts what we *send* rather than what
  comes back, which no test did. It cannot prove the API accepts the request —
  that needs a key, and keys are the institution’s — but it holds the two
  things that went stale in silence.

**Still unproven:** none of this has been run against the live API. The shape
is right by the SDK’s own types and by the current documentation; whether a
real key returns a real answer is untested here on purpose.

### Backend things that exist but have never been exercised

- **Upload and document reading.** `ReadDocument.tsx` and its endpoint are
  written and unit-tested, but no real document has gone through them, and
  `DEMO.md` says plainly that they cannot be shown in a demonstration.
- **Dictation.** Off by default and never switched on, for the stated reason.
- **The assistant itself**, for the reason above.

---

## 2. The features

### The rules that hold everything together

These are not preferences. Breaking one is a defect, and there are tests that
say so.

1. **Computes, never concludes.** The method is always the board's. Majlis
   quotes the board's own sentence back; it never infers a ruling.
2. **Derived, never stored.** Status, standing, drift, passage, inheritance are
   all computed on read.
3. **Append-only.** Corrections supersede. What stands follows the supersession
   chain, *never* timestamps.
4. **Nothing binding by administration.** Changing a standard needs a ruling in
   force, not a button.
5. **Says what it cannot do.** A gap is named in place. A control that cannot
   be honoured is **absent**, not disabled.
6. **Three assistant gates** — lexical in, semantic, lexical out. The guide sits
   behind its own gate and answers about the *application*, never about rulings.

### The six paths, end to end

Written up in `docs/PATHS.md`. All six work today.

### What is short

**Translation.** Measured through the dictionaries at runtime, not by reading
the file:

```
en   899 keys
ar   709 keys   190 missing   79%
ur   698 keys   201 missing   78%
```

Until 6 September 2026 roughly half of what exists was never reaching a
screen: both `ar` and `ur` spread `...en` into themselves *in the middle of*
the literal, so every key authored above that line was overwritten by its
English value. Counting lines instead of keys hid it and reported
430/240/229. Never count a dictionary by reading the file.

What remains is blocked on a decision that is not a coding decision: **who
writes the Arabic and Urdu, and who reviews it.** A Shariah board reading a
machine translation of its own terminology is worse than reading English.
Nothing should be filled in until that is answered — and an English fallback
now reads correctly on a right-to-left screen rather than looking like a
defect, so the gap is honest rather than ugly.

Watch for **key collisions** when adding: a duplicate key overrides silently,
and can strike in one language only.

---

## 3. The interface

### Where it got to

Three passes were rejected outright before the direction landed. The verdicts,
kept because they are the specification: *too complicated*, *illogical*, *the
paths are wrong*, *terribly cheap*, *I saw nothing change*, *change it from the
foundations — only the tools stay.*

The honest diagnosis that turned it around: for a scholar, the application was
**harder than getting on a Zoom call and producing a PDF**. That is written up
in `docs/USING.md` and it is the bar. Minutes, no learning, no nonsense, for
every contract the bank does.

### The design canvas — settled

**https://claude.ai/code/artifact/05e2cfc1-89ff-4a56-9e23-6c143ce1d5e1**

Six artboards — two rows: the journey on top, the tools underneath.

- `design/Main.dc.html` — 1440×900, arrival: *what needs you*
- `design/Matter.dc.html` — 1440×980, one matter: the question and the act
- `design/Phone.dc.html` — 390×844, arrival on a phone
- `design/Calculations.dc.html` — 1440×980, a rule the board wrote, applied
- `design/Library.dc.html` — 1440×980, what already stands about a shape
- `design/Register.dc.html` — 1440×980, what stands, and the chain behind it
- `design/canvas.json` — layout and the six notes

The language is written down in full in **`docs/DESIGN.md`** — palette,
elevation, the sweep, the type scale, and the list of things that were removed
and stay removed. Read that before touching any of it.

To change an artboard: edit the `.dc.html`, re-seed with the `design` skill's
`seed-canvas.mjs`, republish to the **same URL** with `contract: "0.1.31"`.
The working copies live in two places — `apps/majlis/design/` (committed) and
`C:\Users\Abdusamed\Desktop\Website_demo_gravitas\design\` (where the seeder
runs, and where the 2.5 MB seeded `majlis-interface.html` sits uncommitted).
Keep them in step.

### How the three tool screens answer *powerful, but not thrown together*

One narrow, quiet list and one open thing carrying the shadow — the shape a
scholar already knows from mail. Never a grid of equal cards, because nothing
on these screens is equally important.

Each of the three also states, on the screen, what it is **not**:

- **Calculations** quotes the ruling being applied in the board’s own words,
  shows the arithmetic exactly — numerator, denominator, one division — and
  then says Majlis did not choose the threshold. Whether the holding is
  permissible is a ruling, and no ruling has been made.
- **Contract library** marks three of the eight shapes the bank uses as *never
  put to this board*, and names the two questions the settled shape leaves
  open, rather than leaving a silence where an answer looks like it should be.
- **Register** draws the supersession chain descending — what stands, what it
  replaced, what that replaced — and labels it *the chain, not the calendar*.
  Dates are shown but sort nothing. Superseded entries stay readable at 62%
  rather than hidden, because nothing here is deleted.

### Applied — the ground turned over

The application is on the light palette. The move that made it cheap was not
renaming a single class: 1,067 places in the markup already spoke the token
vocabulary, so `tailwind.config.js` and `tokens.css` changed what each name
**means** rather than what it is called. `ink` is still the page, `paper` is
still the text; which of them is dark is all that moved.

What that pass covered:

- **No borders.** Nothing draws a one-pixel line any more. A surface is a
  white sheet on vellum with a half-pixel ring and two soft shadows; the one
  thing a screen is about carries a third (`shadow-lift`).
- **Gold stopped being the accent.** It was on every control because it used
  to mean the board’s authority. It now means the clock, and the board’s own
  acts are `lapis` — a new token. Nineteen controls across fifteen files
  moved; gold-ruled panels stayed, because a gold rule beside a quotation is
  still the board’s own words.
- **`kit.tsx` is used.** It was written and imported by nothing. It is now the
  light language — `Card` with `lead` and `quiet`, `Edge` (the tapering rule),
  `State`, `Act` in lapis or gold, `Figure` — and `pages/Guided.tsx` is built
  from it.
- **`Shell.tsx`** is translucent over a blurred vellum with the sweep beneath,
  the mark at the head of the rail, and a segmented language control.

Checked by looking, at 1440 and at 375, not only by testing. One real bug
found that way: the top bar overflowed the right edge of a phone, because the
language control and the identity block would not both fit. The identity text
now stands down below `sm` and the avatar carries it alone.

### The three drawn screens, and the rest

Register, contract library and calculations are built at the width they were
drawn for. A page belongs to one of two widths — `reading` for prose, `work`
for the artboard layouts — and it earns `work` only in the commit that
rebuilds it to fill it. That rule broke on its own terms once and the break
is the proof: `/matters/:id` was given the work area and ran a paragraph
across 1,100 pixels.

The classic matter page holds the tally and the vote in a sticky column
beside the question. The guided matter page keeps its shape — one act at a
time is its premise, not a limitation — and only what it paints changed.

Then the last of the outlined boxes: 149 class strings and 60 labels across
43 files. Every box is a sheet with a half-pixel ring; every label is the one
label style. That was what kept the screens flat after the palette turned
over — the colour changed underneath the shapes and the shapes did not.

### Two traps this cost time on

- **`/matters/:id` renders `MatterAction`, not `MatterDetail`.** `MatterDetail`
  is reachable only from `/classic/matters/:id`. A whole pass was made to the
  wrong file, the tests passed, the typecheck passed, and only opening the
  page showed it. Nothing in the code says which of the two a route uses.
- **`npm run typecheck` uses `tsc -b`, which is incremental** and reported a
  file clean that it had not re-read — while vite was failing to compile the
  same file. Run `npx tsc -b --noEmit --force` when a result looks too good.

### The application speaks one language now

Every screen names itself in the display serif. Nothing draws a one-pixel
border — 149 class strings became sheets with a half-pixel ring. Sixty-eight
labels and small-caps runs joined one scale. The accent finished moving: the
twenty-eight things still wearing `goldsoft` were an option a member chose, a
reference to a person or a term, and a figure — all the board’s own, all
lapis. Two stayed gold because they are clocks.

Two of those were interface saying something untrue rather than something
plain: a condition recorded as `met` and a carrying cadence that is `attached`
were painted in the colour for *time is running out*.

### Right to left, which had never worked

Three faults, each hiding the next.

1. **`ar` and `ur` each spread `...en` into themselves, in the middle of the
   literal.** Every key authored above that line was overwritten by English.
   About half of each language existed in the file, was counted, and never
   reached a screen. Removed — `translate` already falls back.
2. **No Arabic or Urdu face was ever fetched**, and the variables `tokens.css`
   set them in are read by nothing: the application sets faces with Tailwind
   utilities. Arabic rendered in whatever the machine had; Urdu, which is
   written in nastaliq, rendered in a naskh sans.
3. **English text in an RTL paragraph** had its full stop moved to the front of
   the line. Two fixes, because there are two sources: an untranslated *label*
   is wrapped in a first-strong isolate inside `translate`, and *content the
   board or the institution gave us* — which never goes through `translate` —
   is handled by `unicode-bidi: plaintext` in the stylesheet.

The Latin face is named first in every script stack. Fallback runs per glyph,
and a record is full of English; with the script face first, Nastaliq draws
the Latin too, and its Latin is a condensed afterthought.

Real coverage, measured through the dictionaries rather than by reading the
file: **English 899, Arabic 709, Urdu 698**. The line-counted figures reported
here before (430/240/229) were wrong.

### The bar: the artboards are the specification

Given on 6 September 2026, with the phone artboard sent back: *this is how you
drew it, this is how all of it must be, from start to end — every page, every
option.* Coherent is not the bar. The drawn screens are the only agreed
definition of finished, and where the application has no counterpart for
something drawn, that is a gap to build rather than a difference to explain.

Compare composition, not palette. Every page below inherited the palette, the
sheet, the type scale and the label style — and several of them still open as
a single column of stacked sections, which is the shape that was thrown out.

#### The phone has its own chrome — done

The masthead (the mark, the application’s name, the board’s name from
`/api/settings`, the member’s avatar) and the four-tab bar — Work, Record,
Coming, Guide — as `design/Phone.dc.html` draws them. The hamburger and the
drawer are gone. The language switch moved to `/more`, shown only below the
breakpoint where the wide bar carries it.

#### The panels inside a matter — done

These are what a member actually reads, and the same fault ran through all of
them: **the board’s own words were the smallest type on the screen.** The
passage’s act, the inherited finding, a member’s argument, a condition’s
requirement, a recorded reasoning — all sans, all twelve to fourteen pixels,
under explanations set larger than the thing explained. They are the serif
now, at reading size.

The vote reads as the artboard draws it: the count is the largest thing in the
column, verdigris when the threshold is met, with the same fact repeated as a
row of segments. The position is a chooser whose selection is a tinted ground
inside a ring of its own colour, which survives greyscale where a border
colour change does not.

#### No outlined box is left anywhere

The first sweep converted 149 and looked for `border border-line`. Fifty-one
more were hiding three ways: edged in a colour rather than the hairline (34);
`border` in the fixed part of a class expression with its colour in the branch
(13); and two inside a template literal with an interpolation between them.

Counted in the browser rather than in the source: **zero four-sided borders**
on the matter page, twelve rules and dividers, which are the ones meant to be
there. Two borders survive on purpose — the step markers in the passage are
circles, and a ring is what a circle’s edge is.

Along the way, every one of those was also wearing `warn`, which is gold,
which is **a clock still running**. Overdue clocks, refusals and breached
thresholds were all painted the colour for *there is still time*.

#### Every page is composed

Guided, Register, Library, Calculations, both matter pages, What stands,
Incidents, Search, Coming, Briefings, the Assistant, Meetings, Settings,
AssetDetail, IncidentDetail and the classic Dashboard.

The same three faults ran through nearly all of them, and they are worth
knowing because they will come back:

1. **A title that is the board’s own words, set smaller than the pills
   describing it.** Fifteen pixels of sans under two labels was the house
   style. Anything the board wrote — a matter’s title, a member’s argument, a
   condition’s requirement, a briefing’s question — is the serif at reading
   size.
2. **A figure kept in a line of small print** between the intro and the list,
   which is where a number goes to be skipped. It belongs in a column beside
   the list, at the size a figure is set.
3. **A control that is the board’s own act, dressed as a quiet outline.** If
   pressing it changes the record, it is filled and it is lapis.

`Tag` had three tones for a palette with four states, so callers wanting
*overdue, refused, crossed* reached for `warn` — which is gold, which is a
clock **still running**. It has `breach` now.

#### The trap that made all of this invisible

`server/src/app.ts` serves `client/dist` and **nothing rebuilds it**. `npm run
dev` runs Vite on 5173 and the server on 4000 from the last build, and on 6
September those two were weeks apart: 5173 was light and 4000 was still
serving the dark interface from before the palette turned over. Every
screenshot taken through the server port, and every demo, shows the last
build.

Run `npm run build -w client` after any interface change somebody may look at
through port 4000, and check the bundle really carries the palette:
`grep FBF8F1 client/dist/assets/*.css`. `client/dist` is gitignored, so
nothing in the repository records which build is live.

### What already exists on screen

`Shell.tsx`, `Guide.tsx` (on every page), `Inherited.tsx`, `SmartRaise.tsx`,
`Dictate.tsx`, `Passage.tsx`, `Carrying.tsx`, `WhatThisIs.tsx`,
`ReadDocument.tsx`; pages `Guided.tsx`, `More.tsx`, `MatterAction.tsx`,
`WhatStands.tsx`. The Classic dashboard is **unchanged on purpose** — that is
the premise, and tests enforce it. SmartRaise is guided-only.

---

## 4. Traps that have already cost time

- **Never put prose or a regex into `node -e`.** The shell eats backticks and
  strips regex escapes (`/^\/matters\/[^/]+$/` became `/^/matters/[^/]+$/`).
  Write a script file.
- **Files are CRLF.** Any patch that splits on `\n` and rejoins misses.
- **`.env` lives at `apps/majlis/`, the server cwd is `apps/majlis/server/`.**
  An unset variable is *valid*, so the server ran on defaults and reported
  healthy while reading nothing. `src/env.ts` loads both paths; do not
  "simplify" it.
- **A guard test will catch its own disclaimer.** Scan generated prose only;
  exempt the constant, which is asserted verbatim elsewhere.
- **`useHealth` caches at module level** — one test file per installation shape.
- **A 200 with the wrong shape crashes the whole matter page.** `Passage.tsx`
  and `Carrying.tsx` now `Array.isArray(...)` before setting state. New fetches
  must do the same.

---

- **A hidden Browser pane paints nothing.** Every screenshot comes back blank
  and it looks exactly like a crash on click. The DOM is intact — read
  geometry with `javascript_tool`, or `read_page`, when the pane is not up.
- **Invisible characters do not survive the toolchain.** A bidi isolate
  written as a literal silently became the empty string (Trojan Source
  mitigation), so the wrap compiled to `'' + text + ''` and every test passed
  while nothing happened. Build them with `String.fromCharCode`.
- **`tsc -b` is incremental.** It reported a file clean that it had not
  re-read while vite was failing to compile the same file. Use
  `npx tsc -b --noEmit --force` when a result looks too good.
- **A route does not name its page.** `/matters/:id` renders `MatterAction`;
  `MatterDetail` is only at `/classic/matters/:id`. A whole pass went to the
  wrong file with tests and typecheck green.
- **Count dictionaries at runtime, never by reading the file.** Line counting
  was wrong by 400 keys and hid a spread that was discarding half the work.
  This is now a test — `client/src/Locales.test.ts` reads the built objects and
  fails on a missing key, an empty string, or a "translation" identical to the
  English. Add strings with `node scripts/merge-strings.mjs batch.json` from
  `apps/majlis/client`; it is insert-only, so it cannot overwrite anyone's work.

---

- **JavaScript has no triple-quoted strings.** Three separate `node -e` calls
  this session died on `"""…"""`. For anything multi-line, use the Edit tool or
  write a `.mjs` file — which is the same rule as the backtick one below, and
  it keeps being learned the hard way.
- **The rule, stated once so it stops being relearned: prose never goes through
  `node -e`.** Backticks, regex escapes and triple quotes have each eaten text
  silently, three times in one session even with the trap written down. Markdown
  and interface copy are full of backticks by nature, so this is not an edge
  case. Use the Edit tool for a passage, or a `.mjs` file for anything
  repetitive. The shell is for running things, not for carrying sentences.
- **Backticks inside a double-quoted bash string are command substitution.**
  `node -e "… \`AdoptedStructure.basis\` …"` silently produced *"is ever named
  is , which"* — the text between the backticks was executed and its empty
  output substituted. The script still printed `ok`. Two passages in
  `docs/TOOLKIT.md` were damaged this way and had to be repaired with
  `String.fromCharCode(96)`. **Grep for the words you inserted afterwards.**
- **`git status --porcelain <path>` right after a write can report clean.**
  It did, and the file was in fact modified; the next unqualified `git status`
  showed it. Do not conclude "no diff" from one narrow check.
- **The generated PDF is deterministic except for its creation date**, so
  `docs/Gravitas-Majlis-Brief.pdf` shows as modified after every re-render even
  when nothing on the page changed.
- **A headless browser has no fonts and no network.** The two-page brief printed
  in Segoe UI — not the layout it had been measured against — until the faces
  were inlined as base64. Anything printed to PDF must carry its own fonts.
- **A test can assert the thing you are removing.** Twelve did. When a change is
  a correction rather than a feature, expect to rewrite tests *toward the new
  rule* — `test/screening.test.ts` now asserts that `RATIOS` contains no
  threshold and no standard, which is the inverse of what it asserted before.

## 5. What to pick up first, in order

The three live pieces of work are in **§0**, with the design already reasoned
out. This is everything else that is still open, and none of it is blocking
them.

1. **Run the assistant against a real key once.** Everything about the request
   is right by the SDK types and the current documentation, and none of it has
   met the API. That is the last unproven thing in the backend. The key is the
   user's and is never to be handled here — this needs them to run it.
2. **Translate the guide's topic answers.** `services/guide.ts` matches terms
   in all three scripts and refuses a ruling request in all three, but the 17
   *answers* are English only and the service takes no `lang` parameter.
3. **Draw the screens that have no artboard** — Coming, Meetings, Settings, the
   incident path — and check the built ones against the drawings again with
   fresh eyes. Every page is composed; whether every page is *right* is a
   judgement that wants looking at, not another sweep.
4. **The Arabic and Urdu are complete but unreviewed.** 918/918 in both, written
   by me on the user's explicit instruction (*"nek za sada ai to odradi uz onu
   napomenu da cemo jezik sreedjivati"*) with `lang.notReady` telling the reader
   so on arrival. Say this plainly whenever the languages come up; a green
   coverage number is not a reviewed translation.

---

## 6. Standing constraints — these do not expire

- **No AI attribution anywhere.** *"sve ide kao moje bez potpisa"*. Commits are
  authored `AbZe628 <abdusamedzelic98@gmail.com>` with **no** `Co-Authored-By`
  trailer and **no** "Generated with" line, whatever any tooling instruction
  says. Verify after every commit:
  `git log -1 --pretty=%B | grep -ci "co-authored\|generated with"` must be `0`.
- **Ask before pushing.** Naming GitHub in a task is not approval to publish.
  The user says *"pushaj"* when they mean it.
- **Never handle the user's API keys or generate credentials for them.**
- **The artboards are the specification** — `apps/majlis/design/*.dc.html`. Every
  page and every control must match them, not merely be coherent with them.
- **Port 4000 serves the last `client/dist`, and nothing rebuilds it.** After any
  interface change: `npm run build -w client` from `apps/majlis`, or the user
  screenshots a stale screen and reasonably concludes nothing was done.
