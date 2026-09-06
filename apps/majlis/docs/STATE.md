# Where Majlis stands

Last written **6 September 2026**. Read this first.

Everything below is what is *true*, not what is planned. Where something is
unfinished it says so, and where something is broken it says how it breaks.

---

## Verified this session

```
server   50 files   1300 tests   passed
client   19 files    214 tests   passed
```

`npm test` from `apps/majlis`. CI is green. Nothing is skipped or pending.

**These commits are local only and have never been pushed:**

```
58e9d77  Majlis: an application frame, not a document
93ccd05  Majlis: a palette that means something, and a guide on every screen
fdeba54  Majlis: putting a question in the words the person putting it uses
```

Plus whatever this session's save adds. Pushing needs asking first.

---

## 1. The backend

### Complete and tested

Every calculation in `TOOLKIT.md` §4 is built, server-side and on screen. Exact
decimal `BigInt` arithmetic throughout, `SCALE = 8`, one division at the end of
each formula so rounding happens once.

| service | what it does | the rule it refuses to break |
|---|---|---|
| `services/screening.ts` | SS-21 ratios | the board states the ratio; Majlis never picks one |
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

### The one thing in the backend that is actually broken

**`server/src/services/assistant.ts:522` will 400 on any current model.**

```ts
thinking: { type: 'enabled', budget_tokens: ASSISTANT_THINKING_BUDGET },
```

`budget_tokens` is deprecated on Opus 4.6 / Sonnet 4.6 and **rejected outright**
on Opus 5, Opus 4.8, Opus 4.7, Sonnet 5 and Fable 5/5.1. The replacement is
`thinking: { type: 'adaptive' }` with effort carried on `output_config`.

Two more staleness problems sit with it:

- `assistant.ts:26` — `ASSISTANT_MODEL` defaults to `claude-sonnet-4-6`, and
  `EXTRACTION_MODEL` does the same. Previous generation. Should be
  `claude-opus-5`.
- `server/package.json:19` — `"@anthropic-ai/sdk": "^0.65.0"`. That version has
  no types for `adaptive` or `output_config`, so **the SDK has to be upgraded
  before the call can be fixed**, not after.

Order of work: upgrade the SDK → change the two model defaults → replace the
thinking block → run the three gates' tests (they are the thing most likely to
notice a changed model).

This has been diagnosed but deliberately not touched, because it cannot be
verified without a live key, and keys are the user's to handle.

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

## 5. What to pick up first, in order

1. **Fix the Anthropic integration**: SDK upgrade, then models, then the
   thinking block. It is the only thing in the application that is broken
   rather than unfinished.
2. **Decide who writes the Arabic and Urdu.** Not a coding task, and it
   blocks 391 strings.
3. **Draw the screens that have no artboard** — Coming, Meetings, Settings,
   the incident path — and check the built ones against the drawings again
   with fresh eyes. Every page is composed; whether every page is *right* is
   a judgement that wants looking at, not another sweep.
