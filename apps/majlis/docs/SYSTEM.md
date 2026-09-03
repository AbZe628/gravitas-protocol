# Majlis — the operating system

The definitive specification. Supersedes every earlier plan where they differ.

Companion to [ARCHITECTURE.md](ARCHITECTURE.md) (what is built and why) and
[UX.md](UX.md) (the thesis and the exact order of a scholar's steps).

Every item carries its state:

- **✅ built** — exists, tested, do not rewrite
- **✎ changes** — exists, needs amendment
- **✚ new** — does not exist

---

## 0. Why "operating system" is the right word

An operating system is not an application with many features. It is four
things, and Majlis is the same four:

| An OS has | Majlis has |
|---|---|
| A **kernel** — the one thing everything else trusts | The record: append-only, attributed, hashed |
| **Daemons** — background processes nobody starts by hand | The clocks. They run whether anyone opens the app or not |
| A **permission model** — enforced below the application | The store boundary and the gates, not the routes |
| **Surfaces** — few, learned once, never redesigned | Six screens. A scholar learns them in one sitting and never again |

Everything else — Slack, PDF, calendar, chain — is a **driver**. Drivers are
swappable and none of them may be load-bearing. That is the whole architecture,
and it is why the adapters already built (`enforcement.ts`, `comprehension.ts`,
`store.ts`) are the correct shape and stay.

**The Apple part is not the visual style.** It is that the system has a small
number of concepts, each of which means exactly one thing, and the user is never
asked to hold two of them in mind at once.

---

## 1. The kernel

### 1.1 The record — ✅ built, do not touch

Append-only. Nothing is ever edited or deleted, including by an administrator.

- A vote is **released**, never edited — `returnToDeliberation` (✅) frees a
  position while leaving it visible in the record with the reason it was freed.
  **The `edited_at` field from the enterprise spec is rejected**: an editable
  vote and an immutable audit trail cannot both be true.
- A fatwa is **withdrawn**, never deleted (IFSB GN-6 requires issue, review
  *and* withdrawal as distinct documented acts).
- Operative parameters **freeze on the opening of a vote** (✅) and every
  position carries the hash of exactly those parameters.

### 1.2 The direction asymmetry — ✅ built, and the enterprise spec had it backwards

This is the single most important rule in the system.

| | Permitting | Restricting |
|---|---|---|
| Quorum | **full** (`quorumPermit`) | **lower** (`quorumRestrict`) |
| Effect | after a **48h timelock** | **immediately** |
| Afterwards | any signatory may object during the timelock and halt it | must be **ratified** inside the window or it **lapses** |

> **Be slow to permit. Be fast to restrict.**

An objection during the timelock halts the change outright rather than
restarting a clock. Ratification requires the **full permitting quorum** — a
restriction taken on reduced quorum only becomes permanent when the whole board
would have permitted it.

**Rejected from the enterprise spec:** ratification of permits; a 7-day permit
window; and `POST /matters/:id/ratify → Chair ratifies`. The chair has no
unilateral power in any framework — resolutions carry by majority of attending
members and the chair holds only a casting vote on a tie.

### 1.3 The clocks — ✎ six exist as facts, none is surfaced

Every clock is arithmetic on dates the record already holds. None requires
judgement. This is the daemon layer, and **it is the first thing to build.**

| Clock | Runs from | Consequence | State |
|---|---|---|---|
| **Time-to-decision** | the matter arriving | the business waits, unmeasured | ✚ |
| **Timelock** | vote closing on a permit | 48h, then in force | ✅ |
| **Ratification** | a restriction taking effect | it lapses | ✅ |
| **Rectification** | an actual non-compliance | **30 days**, then a second failure | ✚ |
| **Periodic review** | each ruling's own date | a fatwa describing something that changed | ✚ |
| **Meeting cadence** | the last formal meeting | regulatory breach at six months | ✚ |

Time-to-decision is the number the product is sold on. It is the first time an
institution can see what its board costs it.

### 1.4 The gates — ✅ built, stronger than the enterprise spec described

Three gates stand between a question and an answer (`services/assistant.ts`):

1. **Lexical in** — two-tiered. `HARD` refuses immediately; `SOFT` may only be
   released by an affirmative semantic verdict. Covers Latin, Arabic and Urdu
   script, normalises text first, and carries patterns for attempts to steer the
   gates themselves.
2. **Semantic** — and it is **fail-closed**: if gate 2 cannot be reached, the
   request is refused rather than passed.
3. **Lexical out** — refuses an answer that has drifted into ruling language.

**The processor stays Anthropic.** It is named in the published privacy policy
(`processor: 'Anthropic PBC (United States)'`); changing it means a new
sub-processor and a policy amendment, for no gain. The enterprise spec's
"GPT-4 classifier" is both a regression and a compliance event.

**And the assistant is off by default.** A board's deliberation is among the
most sensitive text an institution holds. `MAJLIS_ASSISTANT=anthropic` without a
key refuses to start rather than running silently degraded (✅).

---

## 2. Permissions — two axes, never one

The enterprise spec's six roles conflate *what you may do* with *what office you
hold*. They are orthogonal and must stay so.

**Axis 1 — capability** (✅ built, `auth/members.ts`)

| Role | May |
|---|---|
| `signatory` | deliberate, **vote**, open matters |
| `advisory` | deliberate, open matters — **no vote** (a real AAOIFI distinction) |
| `liaison` | answer questions of mechanism **inside the deliberation, where the board can see and disagree** |
| `observer` | read only — the auditor, the regulator, the stakeholder |

**Axis 2 — office** ✅ built: `role+office` in a member entry

An office is held *by* a member; it is not a level above them.

- **Chair** — convenes and sets the agenda. Must be a signatory, because a
  chair who could not carry a vote would discover it at the worst moment.
- **Secretary** — records the steps of a matter that belong to the
  **institution** rather than to the board: a rectification plan filed, the
  Directors' approval, the regulator notified, purification paid. Four of the
  nine steps of a non-compliance are not the board's acts, and the board must
  not be able to record them by deciding to.

> **The casting vote is deliberately not implemented.** Frameworks that give a
> chair one are describing a majority-of-attending-members model, where a tie
> can occur. This board decides by reaching a fixed threshold of signatures, and
> a threshold is either met or it is not. Building the mechanism anyway would
> put a power in the record that can never legitimately fire.

**Rejected:** `Executor` as a role. Signing on chain is a capability of a
member's wallet, not a seat on the board.

---

## 3. The four kinds of matter

`MatterOrigin` (✅) already names them. What is missing is that **three of the
four have no workflow of their own** — they are all forced through the product-
approval shape.

### 3.1 Product approval — ✅ complete

The twelve steps in [UX.md §7.1](UX.md). Nothing to add except the clock.

### 3.2 Screening — ✅ built

The three AAOIFI SS-21 ratios:

| Ratio | Threshold |
|---|---|
| interest-bearing debt ÷ market cap | ≤ 30% |
| cash + interest-bearing securities ÷ market cap | < 30% |
| non-permissible income ÷ revenue | ≤ 5% |

**The software computes them and shows the arithmetic. It never concludes from
them.** A failing ratio is a fact; what follows is a ruling. When new figures
cross a threshold the system **raises a matter** — it does not re-rule.

> An earlier draft of this document asserted that the seed data teaches a
> superseded **30% tangible-asset ratio**. It does not. The demonstration rule
> is a **51% majority-tangibility test for secondary trading of mixed pools**,
> which is a different rule serving a different purpose, and the seed already
> labels its own source as fabricated for demonstration. The claim was wrong and
> is withdrawn rather than quietly deleted — a document that corrects itself
> silently is the thing this repository keeps finding and fixing.
>
> ✚ What the seed genuinely lacks is any figures to screen. Now that the ratios
> are computed, the demonstration data should carry a balance sheet to compute
> them from.

### 3.3 Non-compliance (SNC) — ✚ new, and the largest gap

The one that cannot wait for a quarter, and today does.

| | Who | What | Clock |
|---|---|---|---|
| 1 | Bank | Reports the event | — |
| 2 | **Board** | Determines: **actual**, or not | immediately |
| 3 | System | If actual: marks the activity **stopped**, and every similar one | on determination |
| 4 | Bank | Files a rectification plan | **30 days**, counted down |
| 5 | **Board** | Endorses the plan | before day 30 |
| 6 | Directors | Approve | after endorsement |
| 7 | Bank | Submits to the regulator | document already in shape |
| 8 | **Board** | Prescribes purification: amount, and to where | with the determination |
| 9 | System | Adds to the year's disclosure: nature, amount, **count**, rectification | continuous |

**The system stops at step 2.** It may never mark an event non-actual, and it
may never close the determination itself. Steps 3–9 are what the bank is judged
on, and every one of them is arithmetic and assembly.

An incident is its own type, its own store methods and its own route module
(`routes/incidents.ts`), scoped by institution at the store boundary exactly as
matters are. The four steps that belong to the **institution** — the plan, the
Directors, the regulator, the payment — require a secretary or a liaison, and a
signatory attempting one is refused. Plans are a list, so a plan the board sent
back stays in the record with the reason.

### 3.4 Periodic review — ✅ built

No external trigger, so it slips, and a fatwa quietly governs a structure it no
longer describes. **The most valuable thing to automate**, because it is the only
kind that never arrives on its own. A review date is set when a ruling takes
effect; the system raises the matter when it comes due; the board confirms,
amends, or **withdraws**.

---

## 4. The surfaces — six, and no seventh

A scholar learns six screens once. Anything that does not fit one of them does
not get a seventh screen; it gets cut.

| # | Surface | Answers |
|---|---|---|
| 1 | **Attention** | What needs me, by when — and am I finished? |
| 2 | **Matter** | Everything about one decision |
| 3 | **Record** | What has this board decided, and why? |
| 4 | **Rules** | What is in force right now? |
| 5 | **Calendar** | What is coming? |
| 6 | **Settings** | Who is on this board, and how does it decide? |

### 4.1 Attention — the home screen

**Not a dashboard.** A dashboard says how things are going; a scholar needs to
know what needs them.

```
┌────────────────────────────────────────┐
│  3 things need you                     │
├────────────────────────────────────────┤
│ ⚠  Endorse rectification plan          │
│    Retail deposit mispricing           │
│    11 days left of 30                  │
├────────────────────────────────────────┤
│ ●  Your position — commodity murabaha  │
│    3 of 5 recorded · waiting 4 days    │
├────────────────────────────────────────┤
│ ○  Periodic review — sukuk al-ijara    │
│    due this month                      │
└────────────────────────────────────────┘
```

Three states, no fourth: **nothing waiting** (an answer, not a blank),
**something waiting** (closest deadline first), **something overdue** (at the
top, saying what happens next — the consequence *is* the information).

Ordering is by **what is closing**, which is a fact. Never by importance, which
would be the software forming a view.

### 4.2 Vote — the thirty-second surface

Decision · reasoning (compulsory) · submit. Then the tally, naming who has not
voted and **how long they have been waited on**.

**Rejected from the enterprise spec:**

- **`confidence: 1–5`.** A fatwa is not a probability. It creates a discoverable
  document in which a scholar recorded *"somewhat uncertain"* about a ruling the
  bank then sold products against. No governance standard has it. The nuance
  already has a home: the compulsory reasoning.
- **👍/👎 reactions on deliberation.** An unattributed, unreasoned vote running
  in parallel with the real one. `❓ request clarification` stays — it is a real
  act that produces a real entry.

---

## 5. The daemons

**They remove the work of knowing and finding. Never the work of judging.**

### They should

Measure time-to-decision · find precedent before the scholar looks (**40–60% of
board review time is spent searching for precedent** — this is not a convenience
feature, it is half the board's time) · run every clock and surface it before it
bites · compute screening ratios and re-compute on new data · set a review date
on every ruling · **generate the fatwa the moment the threshold is reached** ·
maintain the compliance manual · assemble the annual report · shape the regulator
submission · track purification, prescribed vs paid.

### They must never

Draft reasoning or suggest a position · conclude permissibility from a ratio ·
rank by importance · summarise a deliberation into a conclusion · treat silence
as consent · **close a vote because the threshold was met** · withdraw a fatwa ·
mark an event non-actual · send anything on a member's behalf.

The annual report is the sharpest case: **assemble every fact, leave the opinion
blank.** The opinion is the only part that is the board's, and the only part
worth their signature.

### Escalation — ✎ softened

Email and push are the default. **WhatsApp and SMS are opt-in per member.**
Automated phone calls are never built. Phoning a scholar six hours before a
deadline is not urgency, it is rudeness, and it is how a board stops using a
product.

---

## 6. The two outputs

```
              a matter is decided
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
   Web2 · a document           Web3 · the registry
```

**Web2 — ✎ the export is JSON with a sha256 document hash (✅). It needs to
become finished work:**

- The **fatwa PDF** — ruling, conditions, implementation steps, evidence,
  signatures, dissent, date, canonical hash. Not a data dump.
- The **compliance manual entry** (IFSB GN-6), added as it takes effect
- The **regulator submission** for an SNC
- The **annual report**, assembled from the year, opinion blank

**Web3 — ✅ the adapter exists (`enforcement.ts`).** Operative terms go to the
policy registry; the transaction cannot proceed against them.

### Chain integration — ✎ simplified

- **Safe{Wallet}** for the multi-sig. Majlis proposes the transaction; members
  sign.
- **EIP-712 off-chain signatures** — already the pattern in TeleportV3. Scholars
  sign messages; a relayer submits. **ERC-4337 + Paymaster is rejected for now**:
  a large build for an outcome EIP-712 + Safe already delivers.
- **Emergency — ✎ reframed.** `pause()` is a safety valve, not a parameter
  change; it does not "bypass the timelock" because it never travels through it.
  It requires a **guardian role holding pause and nothing else** — never the
  owner. **Pause fast, unpause slow** through the ordinary path. This is now the
  reason the queued `Ownable2Step` + guardian pauser work matters.
- The **IPFS CID of the final PDF written into the registry** alongside the
  parameters is a genuinely good idea from the enterprise spec and is kept.

---

## 7. Tenancy and identity

**✅ The boundary is built and correct.** Isolation is enforced at the store,
not in the routes — thirty-two routes would be thirty-two chances to forget.
Reads filter and return null (absence, not refusal); writes throw. A member
entry may name its institution (`institution/member:role:secret`), and a service
serving one institution refuses a credential naming another **at the door**,
telling them no more than a wrong password would.

**✎ What changes:** the JSON store becomes PostgreSQL with row-level security
**behind the same `Store` interface**. RLS is a second enforcement layer beneath
the one that exists, not a replacement for it.

**✚ What is new:** JWT (24h) + refresh (30d), Google and Microsoft OAuth,
WalletConnect. The existing login throttle (✅ `loginLimit.ts`) carries over.

**Rejected:** `?tenant=slug` in a query string — tenant enumeration. The tenant
comes from the token or the subdomain.

**Rejected:** the cross-tenant "anonymised" precedent database. A ruling on a
named asset on a given date is re-identifiable, and the engagement letter
generally forbids it. Cross-board search covers **published** fatwas and the
AAOIFI/IFSB standards only.

---

## 8. What is not code

The published privacy policy names the data controller as **a natural person
with no company.** No bank will sign a DPA with a natural person. A legal entity
in Croatia is required before the first bank pilot, and it sits **ahead of every
engineering item below.**

Also outstanding: which regulator first (it decides what the generated document
must contain); who supplies screening figures and how often; whether dissent is
visible outside the board.

---

## 9. Build order

Not five phases over twelve months. Four blocks, ordered by what actually blocks
a pilot.

### Block 1 — the kernel · ✅ complete

Everything here is domain work against the existing store. No infrastructure
dependency, no unanswered question, and it is what makes the system an OS rather
than a form.

1. **The clock service** — all six, as facts, with consequences
2. **Time-to-decision** — on every matter, on Attention, in the record
3. **The SNC flow** — nine steps, the 30-day clock, purification tracking
4. **Periodic review** — review dates set on effect, raised when due
5. **`office`** — chair and secretary, casting vote on a tie
6. **Screening ratios** — computed, arithmetic shown, never concluded
7. **Seed figures** — a balance sheet for the screening ratios to work on

### Block 2 — the record becomes a product

PostgreSQL + RLS behind `Store` · JWT + OAuth · **fatwa PDF** · compliance manual
· annual report assembly · calendar feed · digests · @mentions

### Block 3 — the chain

Safe · EIP-712 signing · on-chain verification badge · IPFS CID in the registry ·
guardian pause on the engines

### Block 4 — the edges

Slack/Teams · DocuSign · webhooks · public API · white-label · SOC 2 preparation

**Cut entirely:** Electron (a third build target for nothing a PWA lacks) ·
Elasticsearch (`tsvector` suffices, and the built ranking is *explainable*, which
this domain needs more than it needs relevance) · Redis (Postgres
`LISTEN/NOTIFY`) · Auth0 · three overlapping monitoring vendors.
