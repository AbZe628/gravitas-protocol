# The toolkit

Everything a Shariah board needs to approve the business of a bank — Web2 or
Web3 — inside Majlis.

Companion to [SYSTEM.md](SYSTEM.md), which is how the board decides, and
[REGISTER.md](REGISTER.md), which is what it decides about. This is **what it
decides with.**

---

## 1. Thirty features, or three

An Islamic bank's board approves murabaha and ijara and mudaraba and sukuk and
takaful; it screens equities; it computes purification and zakat and the profit
due to investment account holders; it rules on late payment charges and currency
exchange and guarantees. Written out as a feature list that is thirty screens,
and thirty screens is a product nobody finishes and nobody learns.

It is three things.

| | | |
|---|---|---|
| **1** | **The structures** | The nominate contracts, each with the conditions that have to hold, as something the board rules against rather than composes |
| **2** | **The calculations** | One shape, many methods. Screening, purification, zakat, profit distribution, tangibility |
| **3** | **The process** | Matters, votes, clocks, fatwas, breaches, reviews — **already built** |

Everything below is one of those three. Adding a contract is adding a structure.
Adding zakat is adding a method. Neither is a new screen.

---

## 2. The rule that makes a toolkit safe

> **Figures come from outside. The board chooses the method. The software does
> the arithmetic and shows its working.**

This already governs the screening ratios and it generalises to all of it,
because on every calculation here there is legitimate disagreement about method:

- **Purification** — per share or per dividend? Income only, or income and
  capital gain? Gross or net? Apportioned by holding period?
- **Zakat** — 2.5% on a lunar year or 2.577% on a solar one? Net asset method or
  net invested funds? Which assets are zakatable?
- **Screening** — market capitalisation as the denominator, or total assets?
- **Profit distribution** — before or after the profit equalisation reserve?

A system that picked one would be issuing a ruling in the shape of a default.

So **method becomes an operative term the board sets**, recorded in the fatwa
alongside the threshold. The software then applies that same method
consistently, forever, and shows the sum every time.

That is the difference between a calculator and a compliance tool.

### And the same line as everywhere else

It computes. It never concludes. *"Non-permissible income is 3.20% of revenue"*
is a fact. *"Therefore the holding is permissible"* is a ruling, and no ratio
answers it.

---

## 3. The structures

A product approval today starts from an empty box: a title, some prose, and a
scholar composing the question. In practice the question has a shape the board
recognises, and the shape is what makes an approval fast.

When the business brings *commodity murabaha for retail deposits*, Majlis should
put the murabaha conditions in front of the board, pre-filled from what the bank
submitted, and ask the board to rule on each. **The board stops composing and
starts judging**, which is the entire compression argument applied to a single
product.

```ts
export interface Structure {
  id: string;                    // 'murabaha', 'ijara-mbt', 'mudaraba'
  name: string;
  family: 'sale' | 'lease' | 'partnership' | 'agency' | 'security' | 'exchange' | 'gratuitous';
  /** What has to hold. The board rules on each, one at a time. */
  conditions: StructureCondition[];
  /** Which calculations this structure normally attracts. */
  calculations: CalculationKind[];
  /** The standard the conditions are drawn from, for the board to confirm. */
  authority: string;
}

export interface StructureCondition {
  id: string;
  /** What must be true. */
  requirement: string;
  /** What goes wrong when it is not — the sentence that makes it checkable. */
  why: string;
  /** How it is evidenced. */
  evidence: 'document' | 'sequence' | 'figure' | 'undertaking';
  authority: string;
}
```

And the board's ruling records, per condition: **met, not met, or not
applicable — with reasoning.** That is the checklist, and it is what the fatwa
then carries.

### The library, and why it is a starting point rather than an authority

The built-in structures are **seeded, and the board adopts, amends or replaces
them.** Majlis must not assert what AAOIFI requires: boards differ, an AAOIFI
board and a Bank Negara board and a bank's own house view will not agree on
every condition, and a system that shipped its own reading as fact would be
ruling.

So the library ships as a draft the board approves once, like any other matter.
After that it is theirs.

### What the library covers — built, as of 2026-09-04

**Nineteen shapes, 89 conditions, ten families.** Every condition carries what
must be true, why it matters in terms of what goes wrong without it, how it is
shown, and where it is drawn from.

| Family | Shapes |
|---|---|
| Sale | murabaha (with commodity murabaha and tawarruq), musawama, salam, istisna' (with parallel istisna') |
| Lease | ijara, ijara muntahia bittamleek |
| Partnership | mudaraba, musharaka, diminishing musharaka |
| Agency | investment wakala |
| Securities | sukuk |
| Exchange | sarf |
| Securing and moving an obligation | kafala, rahn, hawala, wa'd |
| Protection | takaful |
| Given without return | qard hasan |
| Combining contracts | combining contracts in one arrangement |

Five of the shapes the earlier draft listed separately are **conditions inside
another shape rather than entries of their own**, because that is where a board
actually meets them: tawarruq and commodity murabaha are conditions of
murabaha; parallel istisna' is a condition of istisna'; the bilateral promise
is a condition of wa'd; and the asset-backed / asset-based distinction is the
first condition of sukuk rather than two sukuk. Splitting them would have made
a board choose between two shapes before knowing which one they had.

**Combining contracts is its own family with one member**, and it earns the
family. Most arrangements that fail do so as a combination — every part passes
on its own and the sequence produces the fixed return the parts were chosen to
avoid — so a board has to be able to pick it as the shape being judged.

The picker groups by family for the same reason: nineteen buttons in a row is a
wall, and a scholar already thinks *whatever this is, it is a sale, or a lease,
or a partnership*.

Each carries its conditions. To make the shape concrete rather than a list of
names, two examples in full:

**Murabaha**
- The bank must **own the asset and take possession** before selling it. *Why:
  selling what you do not own turns the sale into a financing of money by money.*
  Evidenced by a **sequence** of ownership transfer.
- **Cost and mark-up disclosed** to the buyer. *Why: murabaha is a sale of trust;
  an undisclosed cost makes it an ordinary sale at an unknown margin.* Evidenced
  by **document**.
- **No increase on late payment** may be taken to income. *Why: an increase for
  time on an established debt is riba.* Evidenced by **document**, and it
  attracts a **purification** calculation for anything collected.
- Where it is **tawarruq**, the commodity must be real, identified, and
  deliverable, and the client must not sell it back to the same seller. *Why: a
  circular sale is a loan wearing a sale's clothes.* Evidenced by **sequence**.

**Ijara muntahia bittamleek**
- **Ownership risk stays with the lessor** for the term. *Why: rent is earned by
  bearing the risk of the asset; a lessor who bears none is lending.* Evidenced
  by **document**.
- **Major maintenance and insurance** are the lessor's. *Why: same reason.*
  Evidenced by **document**.
- The **transfer of ownership is a separate promise or gift**, not a term of the
  lease. *Why: two contracts in one contract.* Evidenced by **undertaking**.
- **Rent may not accrue before delivery** of the asset. Evidenced by
  **sequence**.

The point of `why` is that a scholar can disagree with the condition on the
reasoning rather than on the citation.

---

## 4. The calculations

One shape. Every tool below is a **method** inside it, not a screen.

```ts
export type CalculationKind =
  | 'screening'            // may this be held at all
  | 'purification'         // what must be given away
  | 'zakat'                // what is due, and from whom
  | 'profit_distribution'  // what the investment account holders receive
  | 'tangibility'          // may this be traded, and at what price
  | 'late_payment';        // what may not be taken to income

export interface Calculation {
  kind: CalculationKind;
  /** The method the board chose. Never chosen by the software. */
  method: string;
  /** Where the numbers came from. A figure with no source is one somebody typed. */
  source: string;
  asOf: string;
  currency: string;
  /** Strings in, strings out. No money passes through a binary float. */
  figures: Record<string, string>;
  /** The arithmetic, written out, so it can be checked rather than believed. */
  steps: { label: string; working: string; value: string }[];
  results: { label: string; value: string; unit: string }[];
  /** Carried from the service so no interface can soften it. */
  note: string;
}
```

### 4.1 Screening — ✅ built, on the screen

The three AAOIFI SS-21 ratios, computed exactly, arithmetic shown, thresholds
tested by cross-multiplication so no display rounding can flip an answer.
`crossings()` compares two assessments and raises the question when one changes
side.

**What is missing:** it is attached to nothing. It needs to hang off an asset in
the register so a change in the figures raises a matter about a specific holding.

### 4.2 Purification — ✅ built, server only. And it is two different things

**From a breach.** The bank earned income from an activity the board found
non-compliant. The amount is not a ratio: it comes out of the bank's ledger. The
board prescribes that it be given away and to where. **Built, in `incident.ts`.**

**From a holding.** A share passes screening and still carries some
non-permissible income. What was received must be purified in proportion. This
is arithmetic and **does not exist at all.**

Methods, and they give different answers:

| Method | Working |
|---|---|
| **Per share** | (non-permissible income ÷ shares outstanding) × shares held |
| **Per dividend** | (non-permissible income ÷ total income) × dividend received |
| **Per unit** | published purification rate per unit × units held |

And modifiers the board sets alongside: income only or income and capital gain;
gross or net; apportioned by holding period or not.

The board chooses once, in a fatwa. Majlis then computes it every period, shows
the working, tracks prescribed against paid, and carries the total into the
annual report — where it already has a place.

### 4.3 Zakat — ✅ built, server only

Built on 2026-09-03. The base, the rate and who bears it are all supplied and
never inferred, and every sum is shown. The annual report still names a gap,
and the gap is now narrower and exactly stated: the computation is here,
somewhere to record one against a period is not. What it needed:

- **Whose obligation** — the institution's, or the shareholders'. That is a
  disclosure in its own right and the report asks for it.
- **The base.** Net asset method or net invested funds. Zakatable assets — cash,
  receivables expected to be recovered, trade goods — less short-term
  liabilities.
- **The rate.** 2.5% on a lunar year, 2.577% where the accounting year is solar.
  A real distinction, and a clean illustration of why method is recorded rather
  than assumed.
- **The hawl** — the date the year turns, which is a clock like every other
  clock here.

### 4.4 Profit distribution — ✅ built, server only

The annual report's opinion must address whether profit allocation and loss
charging on investment accounts followed the basis the board approved. PER and
IRR are computed in the right order — PER pre-split so both bear it, IRR
post-split so only the depositors do — with the smoothing disclosure that
follows from using them.

What it needs: the **profit-sharing ratio** as approved; the actual profit; the
mudarib's share; what went to or came from the **profit equalisation reserve**
and the **investment risk reserve**; and what each class of account holder
received. Then the comparison the opinion rests on — *the basis approved, beside
what was actually done.*

Reserves are where displaced commercial risk hides, which is why the working
matters more here than anywhere else.

### 4.5 Tangibility and tradability — ◐ the watching is built, the tradability rule is not

Whether a sukuk or a mixed pool may be traded at market price, and at what point
it may only be redeemed at par. Draws on the composition already designed in
[REGISTER.md](REGISTER.md) §5: parts in basis points, totalled by kind, the
ratio computed and the threshold the board set applied.

This is also where the **drift** matters most — a pool crosses the line by
rebalancing, without anybody acting.

### 4.6 Late payment — ✚

An increase taken on a late debt may not go to income. Small, and it belongs
here because it is the same shape: an amount identified, a method for computing
it, and a destination the board prescribes. It feeds purification.

---

## 4a. Where the figures come from

The largest question in the toolkit, answered: **the bank sends its statements,
a scholar loads them into Majlis, and the assistant already here reads them and
proposes the figures.** Typing them by hand stays, and stays possible forever.

Three ways in, and the record says which:

| | |
|---|---|
| **Typed** | A member enters it. Fast, and carries no provenance at all |
| **Extracted** | From a document the bank supplied, with the text it came from |
| **Fed** | Read from the chain, for a Gravitas pool |

### Extraction proposes. It never fills anything in

This is the whole of the design, and it exists because of one failure mode: a
model that misreads 5,100 as 51,000, or takes the wrong line from a balance
sheet, produces a number the board then rules on and the hash locks forever.

So extraction produces **candidates**, not figures.

```ts
export interface FigureCandidate {
  /** Which figure this is offered for. */
  field: string;
  /** What was read, exactly as read. Never normalised on the way in. */
  value: string | null;
  /** The sentence it came from, verbatim. */
  quote: string | null;
  /** Where in the document. */
  locator: { page: number; label?: string } | null;
  /**
   * Confirmed by a person, or not yet.
   *
   * Nothing enters a calculation until this is set. An unconfirmed candidate is
   * visibly unconfirmed and a vote cannot be opened on one.
   */
  confirmedBy: string | null;
  confirmedAt: string | null;
  /** Set where the assistant could not find it. Never a zero. */
  notFound: boolean;
}
```

**"I could not find it" is a first-class answer.** A model asked for a figure
will produce one; a model that cannot say *absent* will invent. The candidate
carries `notFound`, the form shows a gap, and the gap is what a scholar looks
at — which is the opposite of a silently plausible zero.

**The quote is not decoration.** A scholar confirming a figure is checking it
against the sentence it came from, on the same screen, without opening the PDF.
That is the difference between confirming and rubber-stamping.

### Provenance gets better, not worse

A hand-typed figure has no provenance: somebody typed 3,200,000 and nobody can
say from where. A confirmed extraction carries the document, the page, the
sentence, and the member who agreed it was right.

So `Calculation.source` stops being free text:

> *Extracted from "Interim accounts, H1 2026", page 14 — "Total non-permissible
> income 3,200,000" — confirmed by member-a on 3 September.*

That sentence goes into the fatwa. It is a stronger audit trail than the manual
path it replaces.

### What has to exist first

**Durable storage.** `SourceRef.file` was declared and deliberately left unused,
because storage here is not durable and a feature that silently loses a
scholar's document is worse than one that does not exist. Upload cannot ship
before a mounted volume, and extraction cannot ship before upload.

### What a bank will ask, and the honest answer

Sending a board's deliberation to a model run by someone else is already a
decision an institution has to make, which is why the assistant is off unless
turned on. **Sending the bank's financial statements is a larger one.**

So: extraction is off by default, configured per institution, and **the manual
path can never be removed.** A bank that will not send its accounts anywhere
types the figures in and loses nothing but time.

The three gates apply unchanged. Extraction is transcription and not a ruling,
so it passes the first two — but a model that offered *"non-permissible income
is 3.2%, which is within the threshold"* would be stopped by the third, and
should be.

---

## 5. Where it all lives

No new surfaces. The six stand.

| Surface | Gains |
|---|---|
| **Register** | Per asset: composition, screening, the purification rate that follows |
| **Matter** | The structure checklist; calculators while deciding; **method recorded as an operative term** |
| **Record** | Zakat and profit distribution for the period, feeding the annual report |
| **Rules** | The structure library the board has adopted, and its conditions |
| **Calendar** | The hawl, the distribution period, the review dates |
| **Settings** | Which methods this board has chosen, in one place |

And the **fatwa carries the method**, not only the threshold. That is what makes
the ruling reproducible: a reader a year later can recompute the figure and get
the same answer.

---

## 6. What this is honestly not

**It is not a shortcut to a ruling.** Every condition in a structure is
something a scholar rules on. The checklist makes the work orderly and fast; it
does not do it.

**It is not a claim to have encoded fiqh.** The library ships as a draft that
the board adopts. Where boards disagree, the board's version wins and the
software carries theirs.

**It is not small.** This is the largest piece of work in the project and it is
months, not sessions. The order below is by what a board needs first, not by
what is easiest.

---

## 7. Order

0. **Durable storage** — a mounted volume. Upload waits on it, and extraction
   waits on upload. Nothing else in this list does, so it runs alongside.
1. **The register** — the spine everything hangs off. Types and status are
   written; the store, routes and surface are not.
2. **Structures, with three contracts** — murabaha, ijara MBT, mudaraba. Enough
   to prove the checklist shape against real conditions before the library grows.
3. **The `Calculation` shape**, with screening moved onto it. One shape proven
   against the tool that already works.
4. **Purification from a holding** — the first genuinely new calculation, and
   the one that connects the register to the annual report.
5. **Composition and drift** — the register's figures raising matters by
   themselves.
6. **Zakat** — closes a gap the annual report already names.
7. **Profit distribution** — closes the other one.
8. **The rest of the library** — sukuk, salam, istisna', wakala, takaful, the
   support contracts, combination of contracts.
9. **Tangibility, late payment** — small, once the shape is established.

Meetings, @mentions and the per-asset document from
[REGISTER.md](REGISTER.md) §9 sit alongside and do not block any of this.

---

## 8. Still open

1. **How often do figures arrive?** §4a settles where they come from. It does
   not settle cadence: a screening ratio recomputed once a year is a ratio that
   was wrong for eleven months. Whether a bank sends statements quarterly, or a
   scholar loads them when a question arises, changes what drift can catch.
2. **Does the structure library ship with citations?** Naming a standard the
   board has not checked is the software asserting fiqh. Naming none makes the
   library harder to adopt. The current answer is to ship the citation and
   require the board to confirm it on adoption.
3. **Profit distribution needs a practitioner.** The variants in reserve
   treatment are wide and I would not encode them from reading alone.

---

## 9. Where the build stands

*As of 2026-09-04. Update this when it stops being true.*

All four calculations exist, are tested, and are reachable from the
application at `/calculations`. Profit distribution had no HTTP route at all
until this block — the service was written and nothing could call it, which is
a state worth naming: a tested service nobody can reach is not a feature.

| | server | screen |
|---|---|---|
| Screening (SS-21) | ✅ | ✅ |
| Purification | ✅ | ✅ |
| Profit distribution (PER/IRR) | ✅ | ✅ |
| Zakat | ✅ | ✅ |
| A calculation noted against a period | ✅ | ✅ |
| Drift over a standing ruling | ✅ | ✅ |
| Asset register | ✅ | ✅ |
| Structure checklist | ✅ | ✅ |
| Meetings, attendance and the minute | ✅ | ✅ |
| Naming a colleague in the deliberation | ✅ | ✅ |
| A document for every holding | ✅ | ✅ |
| Contract library (19 shapes) | ✅ | ✅ |
| Adoption of the library by the board | ✅ | ✅ |

**And a calculation can now be noted against a period.** The calculations
themselves stay stateless; noting one is a second and deliberate act, because a
calculation that recorded itself would file every trial run. What is recorded
is that the board was shown these figures, from a named source, on a date —
the same line the record already takes with evidence. Noting is not approving:
whether the method was right is a ruling, made in the ordinary way.

The record is append-only. A correction is a new computation naming the old,
and the old one stays because somebody may have acted on it; one recorded
against the wrong holding is withdrawn with a reason and a name rather than
deleted. Which are superseded is derived by looking, never stored.

The annual report's zakat gap is therefore conditional now rather than
permanent, and the figure, its source and its own note reach the printed page.

**The structure library is complete and a board can take it as its own.**
Nineteen shapes across ten families, 89 conditions (§3) — and adoption, which
is what turns them from somebody else's reading into the standard this board
judges by.

A shape is adopted **one at a time**, **under a decision of the board that
carried and is in force**, and what is adopted is a **copy** — so a later
revision of the shipped library does not move under a board that took it two
years ago. A board may amend a shape or rule against using it, and either way
says why. The checklist then runs against the board's version and says on its
face which version it ran against, because a checklist built on the draft and
one built on an adopted shape are different acts.

Requiring a ruling in force is the load-bearing part. Without it adoption would
be a switch a signatory could flip, and the timelock — the window in which a
signatory objects before a ruling takes effect — would be skipped.

**Meetings are a record, and they close the last two gaps the record named
about itself.** Majlis does not host the call: what it holds is the agenda,
who was there, and the minute — and the agenda links each item to the matter
where the decision lives, because a meeting decides nothing.

The annual report can now state the number of meetings held and each member's
attendance, per member rather than averaged, with the reason a board gave for
an absence beside it. And the calendar's sixth clock — meeting cadence, the
one deadline with a regulatory floor behind it — finally has a date to count
from. Where a board has recorded nothing, both say that is an absence in this
record rather than a finding about a board that may have met for years
without it.

Closing a meeting is the board approving the minute, and after that nothing
about it changes. There is no route to amend a closed one; a correction
belongs in the next meeting's minute.

**A scholar can name a colleague in the deliberation**, and it reaches them
where they already look. There is no email here and no push — a mention that
claimed to notify while doing nothing would be worse than no mention at all —
so it arrives on the named member's attention list, alongside whatever the
process wants rather than instead of it. The question is very often why the
vote has not been cast.

It is derived from the text and never stored, it carries no deadline because
being asked by a colleague is not a duty with a clock, and it stops standing
once that member says anything afterwards — one answer closes every question
that preceded it, which is what a conversation actually does.

**Every holding has a document.** The register answers where a holding stands
today; this answers the question an auditor asks, which is how it got there.
One page, printable, handed to somebody outside Majlis: what the board decided
and when, the terms in force with the meaning the board actually read, what the
holding is made of, what has moved under a ruling, and every calculation noted
against it.

It assembles and concludes nothing — every figure comes from the service that
already computed it, carrying that service's own sentence about what it does
not answer. And it names what it cannot say inside the frame rather than in a
footnote: a page headed with a token's name and showing nothing under its
rulings reads as an absence of problems, which is the most misreadable thing
this system could produce.

Next: durable storage — which is what blocks upload, which is what blocks the
PDF extraction in §4a.

1076 server tests, 145 client. Nothing here signs.

### Found and fixed

Two of the three things named here have been dealt with.

1. **The 403 was a rulebook and is now a diagnosis.** It recited all four
   rules at once, so the sentence a reader's eye landed on first was often not
   the reason — an advisory member refused from recording a calculation was
   told first that voting belongs to signatories, which is correct and not
   why. It now says what the credential in front of it **is**, and what would
   be needed instead.

2. **A seeded matter is judged against a shape.** `matter-2026-07-03` names
   sukuk, because the condition it turns on — the proportion of tangible
   assets in a traded pool — is a sukuk condition. No findings are seeded
   against it: an empty checklist is the true state of a matter still in
   deliberation, and a seeded finding would put words in the mouth of a board
   that never met. The checklist and the adopted-or-draft line above it are
   now visible in a demonstration without a member credential.

### Still open

**Arabic and Urdu are about two hundred strings short.** English carries 564
keys, Arabic 374, Urdu 363. The missing ones fall back to English silently,
which is the right failure mode and the wrong outcome in a product whose point
is that a board can work in Arabic. This is not a quick fix — it is two
hundred strings of precise Islamic-finance terminology in two languages, and
the file already says the Arabic and Urdu it does have needs a native reviewer
with knowledge of the subject before any board uses it. It needs a decision
about who writes and reviews them, not an afternoon.
