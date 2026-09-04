# The register

What the board rules *on*.

Companion to [SYSTEM.md](SYSTEM.md), which describes how the board decides.
This describes the thing it decides about, and it is the piece that was
missing.

---

## 1. What was wrong

Everything built so far models the **process**: clocks, quorums, the nine steps
of a breach, the documents. Nothing models the **subject**.

A scholar does not think in matters. They think in assets — *is this token
permitted, what did we say about this pool, we have never looked at that one*.
In the application as it stands a token exists only as free text typed inside a
parameter:

```
assetId = "asset:0x…redacted"
```

Five things follow from that, and each is checkable:

1. **You cannot ask what the status of a token is.** It is the only question a
   bank ever asks, and the record cannot answer it.
2. **The board does not know what it has not looked at.** There is no such
   state as *never examined*, so nothing can be listed under it.
3. **Two rulings about the same asset do not link.** `precedent.ts` matches on
   parameter *keys*, so `assetId` matching `assetId` is a coincidence, not an
   identity.
4. **The policy registry is keyed by asset and Majlis has no asset.** The bridge
   between a decision and its enforcement is a hand-typed string.
5. **A scholar arriving has nowhere to start.** The home screen lists questions
   somebody already raised. It never shows the domain.

The application asks a scholar to **compose a question**. In practice the
question already exists — the asset is there, and the board's act is to judge
it. That inversion is the whole of this document.

---

## 2. One type, several names

An asset is one thing whichever world it is in. A token with a contract address
and a sukuk with an ISIN are the same kind of object to a board: something that
is held, that has a composition, and that a ruling attaches to.

```ts
export type AssetKind = 'token' | 'pool' | 'security' | 'instrument' | 'product';

export interface AssetIdentifier {
  scheme: 'chain' | 'isin' | 'ticker' | 'internal';
  value: string;
  /** Which chain, for a contract address. */
  network?: string;
}

export interface Asset {
  id: string;
  /** Whose it is. Isolation at the store, exactly as everything else. */
  institutionId: string;
  kind: AssetKind;
  name: string;
  /** One thing, several names. A token has an address and a ticker. */
  identifiers: AssetIdentifier[];
  /** Where the entry came from, which is not the same as who ruled on it. */
  source: 'registry' | 'institution' | 'member';
  addedAt: string;
  composition: Composition | null;
  retiredAt: string | null;
}
```

**Identifiers are a list because one asset genuinely has several.** A wrapped
token has an address on two chains and a ticker; a sukuk has an ISIN and the
bank's own code. Forcing one identifier would mean the same instrument entered
twice under different schemes, which is the failure the register exists to end.

**The list is supplied, not composed by the board.** It arrives from the
protocol's own registry, from the institution's universe, or from a member
adding one by hand. `source` records which, because *"nobody has ruled on this"*
and *"nobody has even told us about it"* are different states.

---

## 3. Status is derived, never stored

```ts
export type AssetStatus =
  /** In the register, no ruling, no open matter. Where the work is. */
  | 'never_examined'
  /** A matter naming it is open. */
  | 'under_consideration'
  /** A rule in force permits it. */
  | 'permitted'
  /** A rule in force restricts it. */
  | 'restricted'
  /** A restriction lapsed unratified. It is not restricted, and not approved. */
  | 'lapsed'
  /** Withdrawn from the universe. Kept, never deleted. */
  | 'retired';
```

Computed from the rules in force and the open matters that name it, the same way
`attention`, the manual and the calendar are computed. **A stored status is a
second copy of the truth and a second copy drifts** — a rule is withdrawn and the
badge stays green, which is worse than no badge.

`never_examined` is the state that makes the register worth having. It is the
only place a board can see the shape of what it has not done.

---

## 4. Judging is one click

A matter still carries the decision. What changes is where it starts.

```
REGISTER
  ├─ never examined      ← the work
  ├─ under consideration
  ├─ permitted
  └─ restricted
        │  one click
        ▼
  a matter, already naming the asset —
  its identifiers, its kind, its composition
        │
        ▼
  deliberate · terms · vote
        │
        ├──→  Web2: a fatwa that names the asset
        └──→  Web3: a registry entry keyed by the same address
```

`Matter` gains `assetIds?: string[]` — optional, absent on everything recorded
before it existed, like every other field added here.

**That link is what makes the two outputs one thing.** Today the fatwa is prose
about something and the registry entry is keyed by a hand-typed string, and
nothing guarantees they refer to the same object. With the asset named on the
matter, they cannot refer to anything else.

Raising a free-form matter stays. It becomes the exception rather than the
entrance.

---

## 5. Composition, and the drift that follows

A pool's composition changes without anybody doing anything. A pool that was 51%
tangible in March is 47% in July because it rebalanced. **The board ruled on a
composition that no longer exists, and today nobody finds out until the audit.**

```ts
export interface Composition {
  asOf: string;
  /** Who supplied it. A composition is only as good as its source. */
  source: string;
  /** Parts in basis points. They are expected to sum to 10 000. */
  parts: {
    label: string;
    bps: number;
    kind: 'tangible' | 'debt' | 'cash' | 'receivable' | 'other';
  }[];
}
```

The machinery already exists. `crossings()` in `screening.ts` compares two
assessments and asks a question when one changes side; it has simply never been
attached to anything. Here it attaches to the terms the board itself set:

> The board set `minTangibleRatioBps = 5100`. The composition now reports
> tangible at 4700. **Majlis raises a matter.**

Three rules on that, and they are the same three that govern every other
automation here.

**It raises the question. It does not re-rule.** The status stays `permitted`
until the board says otherwise, exactly as an overdue review leaves a ruling in
force. Compliance lapsing because a number moved while nobody was looking would
be worse than the problem.

**It states the arithmetic, never the conclusion.** *"Tangible is 47.00%,
against the 51.00% this board set in March"* is a fact. *"This is no longer
permissible"* is a ruling.

**It says who supplied the figures.** A composition with no source is a number
somebody typed.

---

## 6. What Majlis may explain about a pool

This is the most valuable thing in the Web3 half and the easiest to get wrong.

**It may explain the mechanism.** What the pool holds and in what proportion.
How the proportion moves when it rebalances. Which of the terms the registry
actually enforces and which are only in the document. What happens to a
transaction that breaches one. All of this is mechanism, it is what the
technical liaison exists to answer, and a board that votes without it is voting
on a description rather than on the thing.

**It may never say whether that makes it permissible.** Three gates already
stand between the assistant and any sentence that sounds like a ruling, and they
apply here unchanged.

The line is the same one the screening panel holds: show the sum, never the
verdict.

---

## 7. Meetings, as a record rather than a room

Boards meet. AAOIFI requires it, CBK requires quarterly attendance of two
thirds, and **Majlis does not record meetings at all** — which is why the annual
report and the calendar both currently say so as a gap.

**Majlis does not host video.** A conversation on camera is not a record, and
the whole premise here is that the record is complete and attributed; a board
that decides on a call leaves a vote with no reasoning behind it. A bank will
also not admit a new video vendor into a room where Shariah deliberation
happens, when Teams or Zoom is already approved through its own security.

So Majlis owns the minute, not the call.

```ts
export interface Meeting {
  id: string;
  boardId: string;
  at: string;
  /** Their own tool. One field. Majlis does not host it. */
  joinUrl: string | null;
  /** Matters put before this meeting, and anything else raised. */
  agenda: { matterId?: string; item: string }[];
  attendance: { scholarId: string; present: boolean }[];
  /** What was discussed and what was decided. Attributed, like everything. */
  minute: string;
  recordedBy: string;
  closedAt: string | null;
}
```

What it earns:

- The **six-month clock** finally has something to count from, and stops being a
  gap in the annual report
- **Attendance** against the two-thirds floor, per member, for the year
- An **agenda** assembled from what is waiting — which the record already knows
- A minute that feeds the annual report rather than being typed into it

A decision still happens in the record. A meeting that reaches one records it as
a matter like any other; the minute says the board discussed it, and the vote
says what each member held. **The meeting is never the place a decision hides.**

---

## 8. What this changes in what is built

| | |
|---|---|
| `types.ts` | `Asset`, `Composition`, `Meeting`; `Matter.assetIds?` |
| `Store` | assets and meetings, scoped by institution like everything else |
| `precedent.ts` | relate on **asset identity**, not only on parameter keys |
| `screening.ts` | `crossings()` attaches to an asset's composition |
| `annual.ts` | meetings and attendance stop being a named gap |
| `calendar.ts` | the six-month cadence becomes a real entry |
| `fatwa.ts` | names the asset it concerns |
| `enforcement.ts` | keyed by the asset's chain identifier rather than a string |
| the client | a register surface; the home screen gains the domain |

Nothing is thrown away. **The matter stays the unit of decision; the asset
becomes the unit of subject.**

---

## 9. Order

1. **The register** — types, store, listing, status derived from rules in force
2. **Judge in one click** — from a register row into a matter that already names it
3. **Composition and drift** — `crossings()` attached, raising the question itself
4. **Meetings as record** — attendance, agenda, minute, the six-month clock
5. **@mentions** — a mention surfaces in Attention; email is only the convenience
6. **A document per asset** — everything the board ever decided about this one.
   Built: `services/dossier.ts`, served at `/api/assets/:id/document`, linked
   from the holding's own page. It says what it cannot say inside the frame,
   because an empty section under a token's name reads as an absence of
   problems rather than as an absence of rulings.

---

## 10. Still open

1. **Who supplies composition, and how often?** The drift in §5 is only as good
   as its feed. For a Gravitas pool this can be read from the chain; for a bank's
   instrument somebody has to send it.
2. **Does an asset belong to one institution or to the protocol?** The type says
   institution, which is right for a bank. Two banks holding the same token would
   then hold two entries, and that is probably correct — they rule separately —
   but it means the register cannot show *"another board permitted this"* without
   the cross-institution question SYSTEM.md already refuses.
3. **What retires an asset?** Delisting is a fact; whether a ruling survives it
   is a question for the board.
