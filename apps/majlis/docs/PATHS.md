# The paths

Every way work reaches a Shariah board, end to end: who starts it, how it
arrives, what happens without anybody doing it, what needs a person, what comes
back, and who is told.

[UX.md](UX.md) describes what the board does. This describes what the **bank**
does, because a board is one end of a path and the path is what a bank is
buying. A board that answers in three days is worthless to an institution whose
question took five weeks to reach it.

Written against what is built. Where something is not built it says so in
place, because a map that quietly draws a road nobody has laid is worse than a
map with a gap on it.

---

## 1. Who is on a path

Six kinds of person, and the distinction that matters is **who may write what**.

| | Who | What they do | In Majlis |
|---|---|---|---|
| **Business unit** | The desk with a product. Retail deposits, treasury, the token team. | Asks. Waits. Implements. | ❌ **No account.** Asks by email today. |
| **Secretary** | Runs the board's paperwork. | Turns a request into a matter. Records what the institution did. | ✅ `office: secretary` |
| **Scholar** | Signs. | Deliberates, cites, states terms, votes with reasoning. | ✅ `role: signatory` |
| **Advisory member** | Sits with the board without signing. | Deliberates. Position recorded, out of the arithmetic. | ✅ `role: advisory` |
| **Technical liaison** | Answers what the mechanism *is*. **No vote, no key.** | Writes down what actually happens. | ✅ `role: liaison` |
| **Auditor / regulator** | Reads afterwards. | Takes the export. | ✅ `role: observer` |

**The gap that matters:** the business unit is not in the system. Every path
below begins with somebody re-typing a question that arrived some other way, and
the clock starts when they do — not when the bank asked. Majlis says so on every
matter (*"the institution may have asked earlier"*), which is honest and is not
a substitute for knowing.

---

## 2. Path one — a product needs a fatwa

**The most common path, and the one an institution feels.** A desk cannot launch
without a ruling specifying the sequence of steps, the disclosures, and the
conditions each transaction must meet.

### How it runs today

| | Who | What | Automatic? |
|---|---|---|---|
| 1 | Business unit | Sends the structure. Email, a deck, a term sheet. | — |
| 2 | Secretary | Opens a matter: title, the question, direction, what is *not* being decided. | ❌ typed |
| 3 | **Majlis** | Finds prior rulings sharing a citation, a term, or a declared interaction. | ✅ `precedent.ts` |
| 4 | **Majlis** | Says what the next act is and whose. | ✅ `passage.ts` |
| 5 | Liaison | Writes down what actually happens, step by step. | ❌ typed |
| 6 | Scholar | Chooses the contract shape. The conditions of that shape attach. | ✅ once chosen |
| 7 | Scholar | Answers each condition, or rules against one as wrongly drawn. | ❌ per condition |
| 8 | Scholar | Cites what it turns on. Attributed. | ❌ typed |
| 9 | Scholar | States the operative terms: key, value, unit, what it does. | ❌ typed |
| 10 | **Majlis** | Says when those terms will be checked, and what that means for drift. | ✅ `carrying.ts` |
| 11 | Board | Deliberates. Threaded, attributed, `@` a colleague. | ❌ |
| 12 | Signatory | Opens the vote. **Terms freeze; every position carries their hash.** | ✅ on the act |
| 13 | Signatories | Vote, with reasoning. Compulsory. | ❌ |
| 14 | **Majlis** | Names who has not voted and how long they have been waited on. | ✅ `tally` |
| 15 | Signatory | Closes the vote. **It never closes itself.** | ❌ deliberate |
| 16 | **Majlis** | 48-hour delay. Any member may object during it. | ✅ |
| 17 | **Majlis** | **The fatwa is assembled.** Ruling, conditions, steps, evidence, signatures, dissent. | ✅ `fatwa.ts` |
| 18 | **Majlis** | Into the compliance manual; a review date set. | ✅ `manual.ts` |
| 19 | Business unit | Takes the document. Web3 takes the terms. | ❌ **no delivery** |

### What is missing on this path

- **Step 1 has no door.** No intake. Nothing records when the bank asked.
- **Step 19 has no exit.** The document renders in a browser; nothing sends it,
  and nobody is told it exists.
- **Steps 5, 8, 9 and 11 are typing.** That is correct — they are the work — but
  nothing helps. A liaison writing the mechanism for the fourth murabaha this
  year starts from an empty box.

---

## 3. Path two — the same product, with the terms enforced

Identical to path one until step 9, and then it stops being the same kind of
document.

At step 9 the board writes `minTangibleRatioBps = 5100`. On path one that is a
condition somebody will be asked to honour, tested at the next review. Here it
is read **before every transaction that depends on it**, and the transaction
that would breach it does not execute.

**This changes what the board is deciding**, and Majlis says so on the matter
itself (`carrying.ts`) rather than leaving it to be discovered:

> There is no interval to drift in. A condition applied before every transaction
> cannot be crossed quietly between meetings and discovered at the audit.

### The two things the board must decide that path one never asks

1. **What happens on breach** — permanent, or restored when the figure returns?
2. **Whether a grace period exists** — and if it does, whether a manager can
   live inside it. This is exactly the question `matter-2026-07-03` is open on,
   and one member has already asked whether a thirty-day grace becomes an
   ordinary operating state.

### What is missing

- **The vote is not the signature.** Majlis records; whoever holds the key
  carries it out, and that is a separate act by a separate person. Stage Three.
- **Nothing tells the key-holder** a ruling is ready to be applied.

---

## 4. Path three — screening, then a ruling

| | Who | What | Automatic? |
|---|---|---|---|
| 1 | Anyone | Enters the figures, or reads them off a document. | ✅ `reading.ts` where on |
| 2 | **Majlis** | Computes the three SS-21 ratios. Cross-multiplied; no display rounding can flip an answer. | ✅ |
| 3 | **Majlis** | States plainly that whether it is permissible is a ruling and no ratio answers it. | ✅ |
| 4 | Scholar | Rules. The figures attach as at that date. | ❌ |
| 5 | **Majlis** | Recomputes on new figures and **raises the question when a ratio crosses**. | ✅ `crossings()` |

**Step 5 is where most of the value is.** Screening drifts silently and a board
finds out at year end.

---

## 5. Path four — something already happened

The only path where the clock is not the board's to set. From the moment the
board finds the event actual, **thirty days run**.

| | Who | What | Clock |
|---|---|---|---|
| 1 | Bank | Reports it. | — |
| 2 | **Board** | Determines: actual, or not. | Immediately, not next quarter |
| 3 | **Majlis** | If actual: marks the activity stopped, and every similar one. | On determination |
| 4 | Bank *(secretary records)* | Files a rectification plan. | **30 days, counted down** |
| 5 | **Board** | Endorses, or returns it with a reason. | Before day 30 |
| 6 | Directors | Approve. | After endorsement |
| 7 | Bank | Submits to the regulator. | Document already in shape |
| 8 | **Board** | Prescribes purification: amount, and to where. | With the determination |
| 9 | **Majlis** | Into the year's disclosure: nature, amount, count, rectification. | Continuous |

**Four of these nine belong to the institution, not the board** — steps 4, 6, 7
and the payment of purification. A board that could file its own institution's
rectification plan would be producing a document saying something nobody outside
the room ever said. So those controls are shown to the **secretary** and hidden
from a signatory, and the route refuses regardless.

---

## 6. Path five — a review nobody triggers

**Nothing makes this happen.** That is the whole problem: a ruling with a
one-year review interval and nobody whose job it is to notice.

| | Who | What | Automatic? |
|---|---|---|---|
| 1 | **Majlis** | Works the date out from the rule's own interval. | ✅ `review.ts` |
| 2 | **Majlis** | Puts it on the calendar, and in a file the board can subscribe to. | ✅ `calendar.ts` |
| 3 | **Majlis** | Names the rules that carry **no** interval, so nothing will ever raise them. | ✅ |
| 4 | Board | Reviews. | ❌ |

Step 3 is the honest part: three rules in force carry no review interval, and
the calendar says so rather than looking empty and complete.

---

## 7. Path six — the ground moves on its own

The only path nobody starts.

| | Who | What |
|---|---|---|
| 1 | Administrator | Publishes a new composition. |
| 2 | **Majlis** | Compares it against the terms the board itself set. |
| 3 | **Majlis** | *"Tangible is 50.00%, against the 51.00% this board set in matter-2026-04-02. Does the standing ruling still hold?"* |
| 4 | Member | Raises a matter in one click, or does not. |

**Three rules on this, and they are the same three that govern every automation
here.** It raises the question and does not re-rule — the status stays
`permitted` until the board says otherwise. It states the arithmetic, never the
conclusion. And it says who supplied the figures, because a composition with no
source is a number somebody typed.

It also names what it **cannot** watch: a term that does not say which part of a
composition it is measured against is reported as unwatched, which is a real
finding — the board set a threshold and nothing is checking it.

---

## 8. What "simple" has to mean here

The instruction is that this should be graspable immediately, the way a feed is.
That is a real standard and it is not the same as making it look like a feed.
Four rules, and each of them is already half-built:

### One question answered on arrival: *what needs me?*

Not a dashboard. A dashboard says how things are going; a scholar needs to know
what needs them, by when, and that they are finished. Three states, no fourth:
**nothing waiting** — an answer, not a blank; **something waiting**, closest
deadline first; **something overdue**, at the top, saying what happens next.

Built: `attention.ts`, and the home screen shows it. **Missing:** it says
*"Nothing is waiting for you"* to an observer as though that were an answer,
when the real answer is that they have not been given credentials.

### One primary act per screen

The matter page now leads with one sentence — *the next act, and whose it is* —
and everything else is subordinate to it. That is the pattern. It is not yet
applied to the register, the library or the calendar.

### Automatic where the answer is derivable, asked where it is a ruling

The dividing line is not difficulty. `carrying.ts` explains what will happen
without a model because the application already knows; `tradability.ts` refuses
to say which parts count as tangible because that is a classification question
belonging to the board. Every automation in this document sits on one side of
that line, deliberately.

### Nothing you have to know in advance

The failure this is against: a member who has done it before knows the order,
and one who has not is looking at a wall of panels. `passage.ts` fixed that on
the matter page. The same test should be run on every other screen.

**What "simple" must never mean here:** fewer confirmations. The vote does not
close itself, terms freeze when it opens, and every position carries the hash of
what it was cast on. Those are the frictions the product is for.

---

## 9. The gaps, ordered by what they cost

1. **No intake.** Every path begins with somebody re-typing. Nothing records
   when the institution actually asked, so *"46 days here"* — the number this
   product is sold on — measures the wrong thing and says so.
2. **No delivery.** The fatwa renders in a browser and nothing sends it. The
   moment the institution stops waiting is the moment nobody is told about.
3. **No notification anywhere.** A scholar finds out something needs them by
   opening the application. `@` mentions surface in Attention and reach nobody
   who is not already looking.
4. **The assistant is not in the matter.** Designed in UX §7.1 step 4 —
   *"answers inside the matter, recorded against it"* — and built as a separate
   page. A scholar asking what a liquidity position is loses their place, and
   the answer is not attached to the question it was asked about.
5. **The consequence figure is seeded.** *"47 of 18,422 transactions would not
   have proceeded"* is the most persuasive thing on the screen and it is written
   by hand in `seed.ts`. A new matter gets nothing.
6. **Arabic is headings-only in places.** A board in the Gulf reads section
   titles in Arabic wrapped around English content.

---

## 10. What is deliberately not automated

Kept here so it is not mistaken for a gap.

- **The vote does not close when the threshold is reached.** A decision that
  happened because a counter hit a number is a decision nobody took.
- **Drift does not raise the matter.** It surfaces the question; a member raises
  it. An automation writing matters into the record would be one mis-specified
  feed away from burying a board under questions nobody asked.
- **Nothing re-rules.** Not drift, not screening, not a review falling due. A
  ruling in force stays in force until the board says otherwise; compliance
  lapsing by arithmetic would be worse than the problem.
- **Nothing signs.** Majlis records what the board decided. Whoever holds the
  key carries it out.
