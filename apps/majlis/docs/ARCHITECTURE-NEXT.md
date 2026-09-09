# The architecture Majlis should have

Written **9 September 2026**, after the audit in `AUDIT-FULL.md` and the
research in `HOW-A-BOARD-WORKS.md` and `COMPETITION.md`.

**This is a proposal. Nothing in it is built.** It needs the owner's agreement
before Stage D starts, and the places where it changes a decision he has already
made are marked.

---

## 0. The one measurement that decides the architecture

Every listed destination was opened, at both widths, under the chair's
credential, and asked: **from here, how many of the other sixteen destinations
can I reach without going back to the arrival screen?**

| width | average | range |
|---|---|---|
| 1440 | **15.1 of 16** | 15–16 |
| 375 | **6.0 of 16** | 5–8 |

Same code, same screens, two different products. On a desktop the application is
a connected whole. On a phone it is seventeen dead ends joined by a directory
page you have to keep returning to.

**Everything else in the audit is downstream of this.** It is why eleven screens
felt missing, why the features looked invisible, and why the arrival screen
carries so much weight that 450 words of explanation grew on it.

And the counterpart measurement, which says what is *not* wrong: of 81 distinct
acts available to the chair, **77 sit on a screen one click from arrival** and
only 2 need two clicks. The acts are not buried. **They are one tap away from
home and unreachable from anywhere else.**

So the architecture problem is not depth, and not missing features. It is that
**the navigation is a hub with no edges.**

---

## 1. The first screen, and the first sixty seconds

### Keep the four doors. Fix what they carry.

`lib/spine.ts` is a good idea implemented half-way, and the half that is missing
is the phone. The proposal keeps **Asked → Deciding → In force → Checked**
exactly as it is, and changes one thing: **a door's tab opens the door, not the
door's main screen.**

Today tapping *In force* jumps straight to `/rules` and the other five
destinations under that door vanish. Instead, tapping *In force* shows the six
destinations under it, each with its live count, and one more tap opens one.
That is two taps instead of one to reach `/rules`, and it turns 6-of-16 into
16-of-16 on a phone, from every screen, at the cost of one tap on the single
most common journey.

On a desktop the rail stays exactly as it is. Nothing changes there, because
nothing there is broken.

### The sixty seconds, literally

A scholar who has never seen this opens it on a phone, signed in as themselves.

| second | what they see | what they do |
|---|---|---|
| 0–3 | one sentence, largest type: **the most pressing thing that is theirs**. Under it, the count and the wait. Nothing else above the fold except the four doors beginning | read it |
| 3–8 | *Two questions are waiting for you to vote.* They tap it | tap |
| 8–20 | the matter, opening at **the act**: the proposal, the vote, their position. Not twelve sections | read the proposal |
| 20–45 | they vote, and are made to write a reason before the vote will take | type, submit |
| 45–55 | back on arrival, the sentence has changed to the next pressing thing | read |
| 55–60 | they see the four doors and understand the shape of the year: things are **asked**, the board is **deciding**, decisions are **in force**, and someone **checks** | — |

**The thing they must not see** is the current first screen: a 44-word notice
about what this session cannot do, then a contradiction, then 250 words of
*how it works*.

### The rule that fixes the arrival screen

> **The first screenful is what is true right now. Explanation lives one tap
> behind a link, never in front of the content.**

Applied literally:

- The *You are reading, not taking part* notice becomes a single line in the
  header, next to the identity, where it is true on every screen instead of
  shouted on two.
- *How it works* and *What it will never do* move behind the existing `Guide`,
  which is already on every screen and is the right place for them.
- `guided.clearShort` stops printing unconditionally. Two sentences, and only
  one appears: *Nothing is waiting for you* when the reader has nothing, or
  *Nothing has been put to the board* when the board has nothing. The observer
  gets the board's line, because an observer has nothing by definition and
  saying so is not news.

That removes roughly 400 words from the two heaviest screens and costs no
feature.

---

## 2. The objects, and one name each

Fourteen domain objects exist. The set is right — **nothing should be added or
removed.** What is wrong is that several are called different things in the
type, the URL and the interface, and a scholar hunting for a screen has to guess
which name won.

| the object | type name | URL | what the interface calls it | proposed one name |
|---|---|---|---|---|
| a question from the institution | `Submission` | `/ask`, `/questions` | *question*, *what I asked* | **question** |
| the board's own reading of it | `Matter` | `/matters/:id` | *matter* | **matter** |
| what the board decided | `Rule` | `/rules`, **and `/record`** | *ruling*, *what stands*, *what we decided* | **ruling** |
| a thing the bank holds | `Asset` | `/register`, `/register/:id` | *holding*, *the register* | **holding** |
| a contract shape | `Structure` | `/library` | *shape*, *contract*, *checklist* | **shape** |
| the board taking a shape up | `AdoptedStructure` | — | *adoption*, *taken up* | **adoption** |
| a sitting | `Meeting` | `/meetings` | *meeting* (was *sitting*) | **meeting** |
| something somebody agreed to do | `Undertaking` | `/undertakings` | *undertaking* | **undertaking** |
| checking execution against approval | `Examination` | `/examinations` | *examination*, *review* | **examination** |
| a breach | `Incident` | `/incidents` | *incident*, *breach*, *event* | **breach** |
| some of the board, looking first | `Committee` | — | *committee* | **committee** |
| a note on a passage | `Annotation` | — | *margin note* | **note** |
| a sum | `Computation` | `/calculations` | *calculation*, *figures*, *computation* | **calculation** |
| a member | `Scholar` + `Credential` | `/settings` | *member* | **member** |

**Three renames are the whole of the work**, and each is already visible as a
fault:

1. **`Rule` → ruling, everywhere.** `/rules` and `/record` render the same page
   under two addresses, and the interface offers *what stands* and *what we
   decided* as though they were two things. One object, one name, one address.
   `/record` and `/classic/record` redirect.
2. **`Asset` → holding.** The door already says *Holdings*, the URL says
   `register`, the type says `Asset`. The register is the screen; the holding is
   the object.
3. **`reg.status.retired` → withdrawn.** It already renders the word
   *Withdrawn*; the key is the last one where two names name one state.

**`Submission` and `Matter` stay two objects.** They look like duplication and
are not: the institution's words are kept verbatim and never edited, and the
board's reading sits beside them so anyone can see whether the board answered
what was asked. That is one of the best decisions in the product and it should
be defended in writing, not tidied away.

---

## 3. The paths, end to end

One path per role, every screen on it. **A screen not on a path is either given
one or removed** — and after this pass, none are removed.

### The scholar who votes (signatory)

```
arrival → the pressing sentence → matter → read the proposal → cite something
  → vote with a reason → arrival (the sentence has changed)
```
Between meetings: `arrival → Checked → examinations → a finding` and
`arrival → In force → holdings → one that has drifted → put it back to the board`.

### The chair

The signatory's path, plus:
```
arrival → Deciding → meetings → convene → agenda → the board book
  → after the meeting: close the vote, bring a ruling into force
```
**The chair is the only role with an act that is currently invisible**: with the
demonstration record's single closed meeting, *convene* is the only meeting
control drawn (F16).

### The secretary

```
arrival → Deciding → meetings → record attendance → save the minute → close
arrival → Asked → questions → take it up as a matter / do not take it up
arrival → In force → papers → the annual report → the opinion → sign
```
The secretary's path is the one the regulation is most specific about
(BNM S 11.14), and it is the one most damaged by F16.

### The advisory member

Deliberates, does not vote. Same as the signatory minus the vote panel. **This
path is currently correct** — verified: advisory is offered *Record a finding*
and the server permits it.

### The liaison

Answers questions of mechanism. Path is `arrival → Asked → questions → reply`,
plus the calculations. Thin, and correctly so.

### The institution desk — the one that needs rebuilding

Today: arrival is the *ask* form with **0 links**, and the four doors then take
the desk onto the board's screens, where it is offered eight controls the server
refuses (F15).

Proposed: the desk gets **its own three doors**, not the board's four.

| door | what is under it | why |
|---|---|---|
| **I asked** | the desk's questions, their state, withdraw | it already has this and it is good |
| **Binds me** | rulings in force that affect this institution, the conditions each carries, the holdings under them | the desk's real question, and nothing answers it today |
| **I owe** | undertakings the institution accepted, rectification plans, purification outstanding and whether it is paid, examinations awaiting the institution's figures | four of the nine breach steps belong to the institution and there is nowhere to see them together |

Nothing new has to be built for *Binds me* and *I owe*. Both are selections over
objects that already exist, and `GET /disclosure` — which already returns the
year's breaches, amounts, destinations and rectification steps and is reachable
from no screen — is most of *I owe* on its own.

**And every board control disappears for this role.** Absent, not disabled.

---

## 4. Where every act lives

The measured rule, which the product very nearly meets already:

> **Every act sits on a screen one tap from a door, and the door is on every
> screen.**

| | today | proposed |
|---|---|---|
| acts one click from arrival | 77 of 81 | 81 of 81 |
| acts needing two clicks | 2 | 0 |
| destinations reachable from an arbitrary screen, 375px | **6 of 16** | **16 of 16** |
| destinations reachable from an arbitrary screen, 1440px | 15 of 16 | 16 of 16 |

The two acts currently at depth 2 are *Record what stops* (inside a breach) and
*Show the working* (inside a calculation). Both are correctly where they are —
they are acts **on** a record, and a record is reached by opening it. The rule
should therefore be stated as **two clicks to a record, one more to act on it**,
which is what a person expects.

### The acts that must move

| act | today | proposed |
|---|---|---|
| ~~attach a document to a matter~~ | **no change needed — this was wrong when written.** `Evidence` is mounted on `MatterPack` at `/matters/:id` as well as on the classic path, and the attach control is gated on `mayAttachDocument`, which is false only because this installation has no mounted volume (`documents: "none"`). That is the product correctly refusing to offer what it cannot honour | — |
| record a finding, reply, deliberate | drawn for the **institution** | absent for the institution |
| the year's breach disclosure | `GET /disclosure`, no screen | under the desk's *I owe*, and in the annual report |
| dissolve a committee, withdraw a referral | no screen | on the committee |
| reopen a saved calculation | `GET /computations/:id`, no screen | on `/calculations` under *Recorded* |
| cite evidence **against** | `POST .../against`, no screen | beside *Cite something* |
| declare a conflict of interest | **does not exist** | on the member, and on the matter |
| record that information was withheld | **does not exist** | on the matter |
| the auditee's response to a finding | **does not exist** | on the examination |

The last three come from `HOW-A-BOARD-WORKS.md` and are named obligations, not
features anyone invented.

---

## 5. What a page looks like

`components/page.tsx` already holds one shape — `PageHead`, `Part`, `Division`,
`Gaps`, `Nothing`, `TwoColumns` — and all twenty-two screens use it. **Keep it.**
The shape is not the problem; what is poured into the head is.

One change, applied to every screen:

```
PageHead    where you are, what this is            <= 12 words
[content]   what is true right now
Division    the acts
Gaps        what this page could not tell you
[Guide]     why it works this way, one tap away
```

**`PageHead` gets a hard budget of twelve words and no second paragraph.**
Measured today: `/classic` puts 631 words on the page and the first record at
2.07 screens down. Under this rule the first record on every screen is above the
fold at 375px, which is the acceptance test.

The explanatory prose is not deleted. It moves into `Guide`, which is already on
every screen and is already the answer to *what does this mean*.

---

## 6. What is kept, and what goes

**Kept, every one, unchanged:** matters, deliberation, voting with reasoning,
objections, the timelock, quorum and thresholds set by the board, dissent that
carries words, the supersession chain, the append-only record, the matter pack's
six parts, the board book, undertakings, examinations with their three refusals,
the nine-step breach flow, purification, the register and drift, the nineteen
shapes and adoption, all six calculations with their working shown, reading a
contract with no `met`, margin notes anchored to the quote, committees that
never rule, signing with the unsealed installation saying so, the assistant's
absence when it cannot be honoured, three languages, and every refusal sentence.

**Goes:**

| what | why |
|---|---|
| `/record` and `/classic/record` as separate screens | one object, one address; both redirect to `/rules` |
| `guided.clearShort` printed unconditionally | it is the contradiction in F1 and F3 |
| the *What it will never do* block on `/classic` | moves to `Guide`; it is 90 words in front of the board's work |
| the four *how it works* blocks on `/classic` | same |
| the institution's eight board controls | absent, not disabled |
| eight of the nine `*.failed` strings | replaced by one sentence per act, naming what failed |

**The `/classic/*` question the owner has never answered.** The recommendation:
`/classic` stops being the main screen of *Deciding* — a door should not open a
screen whose name is an implementation detail. Checked afterwards: the classic
paths hold **no act that is not also reachable elsewhere**, so they become pure
bookmarks, kept as redirects. `/classic` itself stays reachable, because it is
still the fullest single view of a board's work and some readers will want it.

---

## 7. What this proposal does not decide

- **The seed.** F16 showed the demonstration record hides the whole meeting
  lifecycle. That is Stage D work and it is a seed change, not an architecture
  change.
- **PDFs.** There is no engine (F12). Stage D2, unaffected by this.
- **The chain.** `.env.example` turning enforcement on by default (F14) is a
  configuration fix, not an architectural one.
- **Arabic and Urdu at each width.** Not measured yet; the door change affects
  the tab bar, which is where an RTL layout is most likely to break.

---

## 8. The three questions for the owner

1. **The door tab change.** Tapping *In force* would show its six destinations
   instead of jumping to `/rules`. It costs one extra tap on the commonest
   journey and takes a phone from 6-of-16 to 16-of-16. **Agree?**
2. **`/classic` as the main *Deciding* screen.** Recommendation is to demote it
   and move the document-attach act onto the matter. **Agree?**
3. **The institution's three doors** — *I asked*, *Binds me*, *I owe* —
   replacing the board's four for that role. This is the largest single change
   and the one a bank would notice first. **Agree?**

Nothing is built until these are answered.
