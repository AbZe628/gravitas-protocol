# The application

What Majlis is for, what it removes, and the exact order of every step.

Companion to [ARCHITECTURE.md](ARCHITECTURE.md). Grounded in the standards and
the literature rather than in assumption; sources at the end.

---

## 1. The thesis

**Majlis does not record the board's process. It removes the wait inside it.**

Today a matter arrives and waits for a meeting. Boards meet quarterly at best
and every six months at the regulatory floor. A product that is ready in week
one is approved in week nine, and a rejection costs the business
[six months of rework](https://blog.zeroh.io/the-81-point-shariah-compliance-checklist-every-islamic-finance-team-should-be-using/).

The waiting is not caused by the scholars being slow. It is caused by the
**meeting being the only place four things could happen at once**: a quorum, an
attributed position, written reasoning, and a documented outcome.

> **The standards require those four things. They do not require a room.**

Majlis supplies all four continuously. So the decision stops waiting for the
room, and **what took a quarter takes an afternoon.**

### And the number that decides it

> [**40–60% of Shariah board review time is spent searching for precedents
> rather than evaluating structures.**](https://blog.zeroh.io/the-81-point-shariah-compliance-checklist-every-islamic-finance-team-should-be-using/)

Half of the most expensive hour in Islamic banking goes to *finding*. Finding is
precisely what software may do — the retrieval and precedent already built are
not a convenience, they are **half the board's time given back.**

### What the meeting becomes

It does not disappear. It stops being the gate.

| | Today | With Majlis |
|---|---|---|
| **Where a decision originates** | In the meeting | When the matter arrives |
| **What the meeting is for** | Deciding everything | Reviewing what was decided, setting direction, the annual report |
| **What a scholar reads on the plane** | The whole pack | Nothing — it was done in ten-minute pieces |
| **When the bank gets the document** | Weeks after | **At the moment the threshold is reached** |

**Whether a given regulator accepts an asynchronous resolution is a question for
that regulator**, and it differs by jurisdiction. What Majlis does is produce
exactly the evidence such a regulator would ask for — quorum, attribution,
reasoning, dissent, and a timestamped record that cannot be edited afterwards —
in a form that can be handed over as it stands.

---

## 2. One decision, two destinations

The same act, ending in whichever the institution uses.

```
              a matter is decided
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
   Web2 · a document           Web3 · the registry
   signed, dated, complete     the terms enforced in
   handed to the business,     the transaction itself
   the auditor, the regulator
```

**The Web2 path is the product for most institutions**, and it must be finished
work rather than an export of raw data:

- **The fatwa** — the ruling, its conditions, the implementation steps, the
  evidence, who signed and who dissented, dated
- **The compliance manual entry** — added the moment it takes effect
- **The regulator submission** — for a non-compliance, already in shape
- **The annual report** — assembled from the year, opinion left blank

**The Web3 path is the same decision, enforced.** The operative terms go to the
policy registry and the transaction cannot proceed against them. That is the
part nothing else can do — and it is available to an institution that wants it
without being required of one that does not.

The decision is identical either way. Only the destination differs.

---

## 3. What the board actually does

A Shariah Supervisory Board is a governance organ with a statutory mandate:
appointed by shareholders at the annual general meeting, at least three members,
signed engagement letter (AAOIFI Governance Standard No. 1). Resolutions pass by
majority of attending members; a tie goes to the chair.

| Duty | Cadence today |
|---|---|
| Approve every product and contract **before launch** | Waits for a meeting |
| Issue fatwas, and review and **withdraw** them | Waits for a meeting |
| Rule on screening — asset, counterparty, structure | Waits for a meeting |
| Determine whether an incident is an **actual** non-compliance | Cannot wait, and often does |
| Prescribe purification of non-compliant income | With the determination |
| Review existing approvals | Slips |
| Receive the Shariah audit | Annually |
| Sign the annual report to shareholders | Annually |
| Meet formally | Quarterly, floor of six months |

**Every row that says "waits for a meeting" is a row Majlis removes the wait
from.** The bottom two stay as they are; they are genuinely annual.

Around the board sit four bank functions Majlis must be legible to (Bank Negara
Shariah Governance Framework): **Shariah Risk Management**, **Research &
Advisory**, **Review** (continuous, internal), **Audit** (independent).

---

## 4. Four kinds of work, four clocks

One shape does not fit them. They differ in what the board is deciding and what
is running out.

### 4.1 Product approval — *the bank is waiting*

A business unit has a structure and cannot launch without a fatwa specifying
**the exact sequence of steps, the required disclosures, and the conditions each
transaction must meet.**

The clock is commercial and nobody writes it down. Majlis writes it down: **how
long this has been waiting, and on whom.**

### 4.2 Screening — *arithmetic, then a ruling*

AAOIFI Standard 21 sets three ratios:

| Ratio | Threshold |
|---|---|
| Interest-bearing debt ÷ market capitalisation | ≤ 30% |
| Cash and interest-bearing securities ÷ market capitalisation | < 30% |
| Non-permissible income ÷ total revenue | ≤ 5% |

**The software computes them. It never concludes from them.** A ratio that fails
is a fact; what follows is a ruling.

### 4.3 Non-compliance — *thirty days, and it has already started*

1. The event is put to the board
2. The board determines whether it is an **actual** non-compliance
3. If actual: the activity **stops immediately**, and every similar one
4. A **rectification plan within 30 days**
5. The board **endorses** it
6. The Board of Directors **approves**
7. **Submitted to the regulator**
8. Non-compliant income **purified**, as the board prescribes
9. The year's disclosure: nature, amount, **count of events**, rectification

This is the one that cannot wait for a quarter and today does. **The software
stops at step 2; steps 3 to 9 are what the bank is judged on.**

### 4.4 Periodic review — *nothing makes it happen*

No external trigger, so it slips, and a fatwa quietly governs a structure it no
longer describes. **The most valuable thing to automate**, because it is the
only one that never arrives on its own.

---

## 5. Six clocks

Every one is arithmetic on dates the record already holds. None requires
judgement. **None is currently surfaced.**

| Clock | Runs from | If missed |
|---|---|---|
| **Waiting on the board** | The matter arriving | The business waits; nobody measures it |
| **Rectification** | An actual non-compliance | 30 days, then a failure on top of the original |
| **Ratification** | A restriction taking effect | It lapses |
| **Periodic review** | Each ruling's own date | A fatwa describing something that changed |
| **Meeting cadence** | The last formal meeting | Regulatory breach at six months |
| **The financial year** | Year end | The audit and the annual report |

The first is new and is the point of the product: **time-to-decision, measured,
on the screen, for everyone.**

---

## 6. The home screen

Not a dashboard. A dashboard says how things are going; a scholar needs to know
**what needs them, by when, and that they are finished.**

```
┌────────────────────────────────────────────────┐
│  3 things need you                             │
├────────────────────────────────────────────────┤
│ ⚠  Endorse rectification plan                  │
│    Retail deposit mispricing                   │
│    11 days left of 30                          │
├────────────────────────────────────────────────┤
│ ●  Your position — commodity murabaha          │
│    3 of 5 recorded · waiting 4 days            │
├────────────────────────────────────────────────┤
│ ○  Periodic review — sukuk al-ijara            │
│    due this month                              │
└────────────────────────────────────────────────┘
```

`waiting 4 days` is the line that changes the institution. It is the first time
anyone can see what the board is costing the business, and it is the number the
product is sold on.

Three states, no fourth: **nothing waiting** — an answer, not a blank;
**something waiting**, closest deadline first; **something overdue**, at the top,
saying what happens next, because the consequence is the information.

---

## 7. The exact order

### 7.1 A product approval

| | The scholar | The software |
|---|---|---|
| 1 | Reads what is asked | One screen. Nothing to expand |
| 2 | Reads the mechanics | The step sequence, as steps |
| 3 | — | **Precedent is already there.** Prior rulings on the same citation, the same term, the same declared interaction — this is the 40–60% |
| 4 | Asks about mechanism | Assistant answers **inside the matter**, recorded against it, refusing anything that is a ruling |
| 5 | Cites what it turns on | Evidence attaches, attributed |
| 6 | States the conditions | Operative terms: a key, a value, a unit, and what it does |
| 7 | Discusses | Threaded, attributed |
| 8 | Opens the vote | **Terms freeze.** Every position carries the hash of exactly these terms |
| 9 | Votes, with reasoning | Compulsory; the tally names who has not yet, and how long they have been waited on |
| 10 | Closes the vote | Threshold reached *permits* closing. It never closes itself |
| 11 | — | **The fatwa is generated: ruling, conditions, steps, evidence, signatures, dissent, date.** Web2 takes the document; Web3 takes the terms |
| 12 | — | Added to the compliance manual; a review date set |

Steps 1 to 10 happen in ten-minute pieces, from a phone, over days rather than
in a quarterly session. **Step 11 is the moment the bank stops waiting.**

### 7.2 A non-compliance event

| | Who | What | Clock |
|---|---|---|---|
| 1 | Bank | Reports the event | — |
| 2 | **Board** | Determines: actual, or not | Immediately — *not next quarter* |
| 3 | Software | If actual: marks the activity **stopped**, and every similar one | On determination |
| 4 | Bank | Files a rectification plan | **30 days**, counted down |
| 5 | **Board** | Endorses | Before day 30 |
| 6 | Directors | Approve | After endorsement |
| 7 | Bank | Submits to the regulator | **Document already in shape** |
| 8 | **Board** | Prescribes purification: amount, and to where | With the determination |
| 9 | Software | Adds to the year's disclosure: nature, amount, count, rectification | Continuous |

### 7.3 Screening, and the drift

| | The scholar | The software |
|---|---|---|
| 1 | Sees the instrument and the figures | **Computes the three ratios**, each against its threshold, arithmetic visible |
| 2 | — | States plainly: these are the figures; whether it is permissible is the board's ruling |
| 3 | Rules | The ruling attaches, with the figures as at that date |
| 4 | — | **Re-computes on new data and raises a matter when a ratio crosses.** It does not re-rule; it says the basis has changed |

Step 4 is where most of the value sits: screening drifts silently and a board
finds out at year end.

### 7.4 A periodic review

| | The scholar | The software |
|---|---|---|
| 1 | — | **Raises it.** The date was set when the ruling took effect |
| 2 | Reads what changed | The original ruling, its conditions, and what has moved: figures, standards revised, later rulings |
| 3 | Confirms, amends, or withdraws | Withdrawal is a first-class act, as IFSB GN-6 requires |
| 4 | — | The manual updates; a new review date is set |

---

## 8. Automation

**It removes the work of knowing and finding. It never does the work of judging,
and it never turns inaction into action.**

### It should

- **Measure time-to-decision** on every matter, and show whose step it is
- **Find precedent before the scholar looks** — the 40–60%
- **Run every clock** and surface each before it bites
- **Compute screening ratios**, show the arithmetic, re-compute on new data
- **Set a review date** on every ruling, and raise it when due
- **Generate the fatwa** at the moment the threshold is reached
- **Maintain the compliance manual** continuously
- **Assemble the annual report** — everything except the opinion
- **Shape the regulator submission** for a non-compliance
- **Track purification**: prescribed, paid, outstanding
- Say what changed since you last looked; carry a draft between devices

### It must never

- Draft reasoning, or suggest a position
- **Conclude permissibility from a ratio**
- Rank matters by importance — order by what is closing, which is a fact
- Summarise a deliberation into a conclusion
- Treat silence as consent, or close a vote because the threshold was met
- **Withdraw a fatwa, or mark an event non-actual**
- Send anything on a member's behalf

The annual report is the sharpest case: **assemble every fact, leave the opinion
blank.** The opinion is the only part that is the board's, and the only part
worth their signature.

---

## 9. What the institution gets

1. **Decisions in days instead of quarters**, with the wait measured for the
   first time.
2. **The document at the moment of decision** — fatwa, manual entry, regulator
   submission — rather than typed up weeks later.
3. **Half the board's time back**, because finding precedent stops being their
   job.
4. **The compliance manual maintains itself.**
5. **The 30-day clock stops being a memory.**
6. **Screening stops drifting silently.**
7. **The annual report assembles itself** except for the opinion.
8. **The audit answers itself** — every ruling joined to its reasoning,
   evidence, dissent and fixed terms, with a hash proving the terms did not
   change afterwards.
9. **And when the institution is ready, the same decision is enforced on chain**
   without being re-made.

Points 1 and 9 are the ones nothing else does.

---

## 10. The device

The board reads and decides on a phone, in ten-minute pieces. All of section 7
must complete there — that is what makes the compression real. The desk is for
drafting operative terms, reading at length, and producing an export.

- Offline reading; actions **queue and say they are queued**, never look sent
- Push for the one thing that needs you now, or a window about to close
- Documents viewable in place
- Biometric unlock, because a scholar will not type a password to read a thread

---

## 11. States that must be designed

| State | What it must do |
|---|---|
| **Nothing waiting** | Read as an answer, not a blank |
| **Nothing found** | Say what was searched, and how to widen it |
| **Refused** | Give the condition, not the prohibition |
| **Offline** | Say what is cached, and that an action is queued |
| **Observer** | Say why there are no buttons, before they go looking |
| **Not configured** | Say what is missing and the command that fixes it |
| **Record reset** | Say when this record began |
| **Stale read** | Report a failure as a failure |
| **A clock overdue** | Say what happens next — the consequence is the information |

---

## 12. A correction to this document

An earlier draft said the demonstration record teaches a superseded **30%
tangible-asset ratio**. It does not. The seeded rule is a **51%
majority-tangibility test for secondary trading of mixed pools** — a different
rule, for a different purpose — and the seed already labels its own source as
fabricated for demonstration rather than presenting it as an AAOIFI position.

The claim is withdrawn here rather than deleted, because a document that
corrects itself silently is exactly the fault this project keeps finding in
other people's documents.

What the demonstration data genuinely lacks is a balance sheet. The three
ratios of Standard 21 are now computed by the software, and there are no
figures in the record for them to be computed from.

---

## 13. Still open

1. **Which regulator, first?** Whether an asynchronous resolution is accepted
   differs by jurisdiction, and the first one we sell into decides what the
   generated document must contain.
2. **Does the chair have procedure** — convene, agenda, a casting vote as the
   frameworks give them?
3. **Is dissent visible outside the board?** Openness serves the record;
   discretion may serve candour.
4. **Who supplies the screening figures, and how often?** The re-computation in
   7.3 depends on it.
5. **What does a scholar do first, on a phone, at 22:00, with four minutes?**
   The honest answer decides the home screen, and it should come from a scholar.

---

## Sources

- [AAOIFI — Composition and Duties](https://aaoifi.com/composition-and-duties/?lang=en)
- [AAOIFI — Shari'ah Screening Methodology (Standard 21)](https://www.oicexchanges.org/files/1---shari-ah-screening-in-the-islamic-capital-markets-dr-hamed-merah-secretary-general-aaoifi.pdf)
- [The 81-Point Shariah Compliance Checklist](https://blog.zeroh.io/the-81-point-shariah-compliance-checklist-every-islamic-finance-team-should-be-using/) — the 40–60% precedent-search figure and the six-month rework cost
- [Shariah Governance Framework for Islamic Banking Institutions — State Bank of Pakistan](https://www.sbp.org.pk/ifpd/2024/C8-Annex.pdf)
- [Shariah Supervisory Board rules — Central Bank of Kuwait](https://www.cbk.gov.kw/en/images/13part1-2783_v60_tcm10-2783.pdf) — quarterly meetings, majority of attending members, chair's casting vote
- [Standard re. Shari'ah Governance — CBUAE Rulebook](https://rulebook.centralbank.ae/en/rulebook/standard-re-shariah-governance-islamic-financial-institutions)
- [Shariah Non-Compliance Treatment in Malaysian Islamic Banks — IJMAR](https://www.ijmar.org/v6n4/19-016.html)
- [Making Sense of the 30% Rule — Amanah Advisors](https://amanahadvisors.com/making-sense-of-the-30-rule-in-islamic-finance/)
- [Annual Report of the Internal Shari'a Supervisory Committee — ADIB](https://www.adib.ae/-/media/project/adib/adibsite/docs/sharia/sharia-annual-report-en.pdf)
