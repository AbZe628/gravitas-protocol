# The architecture

Written **9 September 2026**, second version. The first one was a list of
patches with measurements attached, which is not an architecture, and building
it produced exactly what a patch list produces.

**Nothing here is built.** Read §1 first; if the diagnosis is wrong the rest is
worthless.

---

## 1. What is actually wrong

Not a theory. Every control on every screen was pressed the way a person
presses it, and the page compared before and after.

```
47 controls pressed, as an observer, at 375px
 2  already-selected tabs, correctly inert
 1  downloads a file and says nothing on screen
44  did something
```

**Of the 44, thirty-one answered by growing the page below the fold.**

| screen | press | the answer appears |
|---|---|---|
| `/check` — all 19 contract shapes | y≈488 | y≈1,858 — **1.7 screens below** |
| `/rules` — *In force today* | top | +1,584px |
| `/calculations` — *Tradability* | top | +1,284px |
| `/calculations` — *Profit distribution* | top | +1,033px |
| `/examinations` — *Tell the bank* | top | +933px |
| `/calculations` — *Zakat* | top | +819px |
| `/meetings` — *Show the record* | top | +517px |

So:

> **Not one control in this application is broken. Every one of them works.
> The application answers somewhere you are not looking.**

On a phone that is indistinguishable from nothing happening, and it is the
whole of *"klikam i ništa se ne dešava"*. It is also the whole of *"sve su
tekstovi"*: when the answer to a press is 1,800 pixels away, what is in front
of you is only the prose that was already there.

**The second cause, and it is mine.** The instance shown was running with no
credentials, so every session was an observer, and an observer is refused by
every act — vote, deliberate, open a matter, convene a meeting, all `403`. The
product then correctly draws no button, because a control that cannot be
honoured is absent. A read-only instance is the correct behaviour of a
deployment that was never given a board, and it is the wrong thing to show
anybody.

**The third, smaller.** *Export for audit* fetches 7,112 bytes and starts a
download. It puts nothing on the screen when it works, and — because the
handler has no `catch` — nothing at all when it fails.

---

## 2. The rule the whole design follows

> **A press is answered where the finger is, immediately, and in a way that
> cannot be missed.**

Three obligations, in order:

1. **Answer in place.** What a press produces appears at the press, or the
   press moves the reader to it. Never both nothing and something 1,800px away.
2. **Answer at once.** Between the press and the answer there is a state, and
   it is on the control itself, not elsewhere on the page.
3. **Answer even when the answer is no.** A refusal, a failure and an empty
   result are all answers and all belong at the press.

Everything in §3 and §4 is this rule applied.

---

## 3. What changes, screen by screen

Nothing is removed. No object changes. No service changes. **What changes is
where a screen puts its answer.**

### The pattern: choose → work → result, in one place

Today `/check` and `/calculations` are both *a row of choices, then a very long
page*, and the thing your choice produced is at the bottom of it. Both become:

```
  [ the choice, as a row ]
  ────────────────────────────
  the chosen thing, right here:
    what it needs from you
    the act
    the result, in this same block
```

The chosen block replaces the row's neighbourhood rather than extending the
page. On a phone, choosing scrolls the chosen block to the top.

Applied to:

| screen | today | after |
|---|---|---|
| `/check` | 19 buttons, then the reading 1.7 screens down | pick a shape and the draft box is under your finger |
| `/calculations` | 7 tabs, the form up to 1,284px below | the tab's form opens where the tab is |
| `/rules` | two tabs, the second grows 1,584px | the two lists swap in place |
| `/examinations` | *Tell the bank* opens 933px down | opens in place |
| `/meetings` | *Show the record* grows 517px | in place |

### Every act says what happened

One component, used by all 65 acts:

- **before**: the control, plain.
- **during**: the control itself says it is working. Nothing else moves.
- **after, worked**: one line at the control, naming what happened — *saved*,
  *recorded*, *the file is in your downloads*.
- **after, refused**: the server's own sentence, at the control.
- **after, failed**: what failed and what to do, at the control. Never silence.

This is what replaces the nine keys that all say *That did not go through.*
Each act names itself.

### `/check` in particular, because it is the one that competes

It is the feature the AI products are bought for, and it is the worst offender.
After: pick a shape, and immediately under the row you get the paste box, the
conditions the board will read against, and — when a session cannot run a
reading — **that sentence before the picker, not after a press that appears to
do nothing.**

---

## 4. The flows, end to end

Kept as they are in the objects and services; re-laid so each is a path a
person walks without leaving the screen they are on.

**A scholar with a question to decide.** Arrival names the one pressing thing →
the matter opens at the vote → read, cite, vote with a reason → the arrival
sentence has changed. *The matter screen already does this. It stays.*

**A scholar checking a draft.** `/check` → pick a shape → paste → the reading
appears under the paste box, condition by condition, with the sentence and the
offset. Never a verdict.

**A scholar doing a sum.** `/calculations` → pick the sum → the form is there →
the working is shown under it → record it, and the record says so.

**The secretary running a sitting.** `/meetings` → the open meeting → record
attendance, keep the minute, close it. **This flow is invisible on the
demonstration record because the only seeded meeting is already closed and the
minute field renders only while it is not.** One seed change, and it is the
flow every board portal is bought for.

**The bank's desk.** Its own three doors — *I asked*, *Binds me*, *I owe* —
instead of the board's four, and none of the board's controls. `GET /disclosure`
already returns most of *I owe* and no screen opens it.

---

## 5. What is kept

Everything. Every object, every service, all 107 routes, all 22 screens, the
four doors, the record's append-only chain, the refusals, the three languages,
the matter pack, the nine-step breach, the examinations, the committees that
never rule, the margin notes, the signing. **This architecture changes no
behaviour and adds no capability.** It changes where the application speaks.

---

## 6. Before any of it: the demonstration has to be usable

None of the above matters if the instance is read-only, because then there is
nothing to press at all.

The demonstration instance must run **with a board**, and there must be a way
to be somebody. That is the first change, it is configuration rather than
design, and it is the reason the product looked empty.

---

## 7. The order

1. The demonstration runs with a board, and the seed has an open meeting.
2. Every act answers at the control — the one component, applied to all 65.
3. `/check` and `/calculations` answer in place.
4. `/rules`, `/examinations`, `/meetings` answer in place.
5. The desk's three doors.

Each is separately verifiable by pressing the thing and seeing the answer
without scrolling, which is the acceptance test for the whole of this document.
