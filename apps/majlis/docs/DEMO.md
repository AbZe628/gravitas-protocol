# The demonstration

Written for showing Majlis to a Shariah board, not to a procurement committee.
The audience is a scholar who has issued fatwas for twenty years, has never
needed a piece of software to do it, and is entitled to ask what this is for.

Everything below runs on the seeded demonstration data. Nothing in it is a real
institution, a real board, or a real ruling, and every screen says so.

---

## 1. Before you start

### The two halves

Majlis runs the same either way, and the difference is worth showing rather
than explaining:

| | What it means |
|---|---|
| **Nothing attached** | A board inside a bank with no chain anywhere near it. The record, deliberation, evidence, terms, voting and export all work. This is the **larger market** and the ordinary installation. |
| **Chain attached** | The same application, reading a live registry that applies the board's terms before every transaction. |

The demonstration is stronger if the audience sees both, and strongest if they
see the *same screen* twice.

### Setting it up

Create `apps/majlis/.env` with this. Nothing in it is a secret and nothing in
it should ever become one — the RPC endpoint is public, the registry address is
public and verified on Arbiscan, and no key of any kind belongs in this file.

```
MAJLIS_ENFORCEMENT=gravitas-registry
POLICY_REGISTRY_ADDRESS=0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
MAJLIS_ASSISTANT=off
```

Then:

```bash
npm run dev
```

Check it took, before anyone is watching:

```bash
curl -s localhost:4000/api/health
```

`"enforcement":"gravitas-registry"` means the chain is attached. `"none"` means
the file was not read, and the demonstration will quietly show the other half.

**To show the other half:** delete `.env` and restart. That is the whole switch.

### Three things that will be absent, and should be

The demonstration installation has **no member credentials**, **no mounted
volume** and **no assistant**. That is deliberate and it is the honest state:

- Nobody can vote, so every control that would write is hidden rather than
  offered and refused.
- Documents cannot be attached, so the upload control is absent.
- Questions cannot be sent to a model, so that panel is absent.

Say this at the start rather than being caught by it. *"This installation has
not been given its keys"* is a sentence the audience will respect; a button
that does nothing is not.

---

## 2. The demonstration, in order

Roughly twenty minutes. Each step has one thing to land.

### Step 1 — The register · `/register`

> **5 of 7 have never been put to this board.**

Open with this. Not a feature — a fact about their own institution that nobody
currently has a way of stating. Among the five is a commodity murabaha for
retail deposits: an ordinary web2 product, never ruled on, sitting in the same
list as a token.

**What to land:** Majlis is not a Web3 tool that also does banking. It is a
board's register, and the chain is one thing in it.

### Step 2 — A matter, and the order of the work · `/matters/matter-2026-07-03`

At the top of the page:

> **WHAT IS NEXT** — Open the vote · a signatory
> *The terms are still moving. Opening the vote fixes them.*
> **46 days here**

Press **Show the whole passage**. Two columns: putting the question in shape,
and deciding.

**What to land:** the scholar always knows what the next act is and whose it
is. The `46` is the number nobody currently measures — how long the business
has been waiting, and on whom.

Say plainly what it does **not** do: there is no progress bar and nothing ever
says the question is ready to be decided. Only one step is marked *required*,
because only one thing is actually refused — that somebody has spoken. The rest
the board may skip, and it will be recorded that they did.

### Step 3 — What the terms will do

Immediately above the operative terms on the same page:

> **WHAT THESE TERMS WILL DO** · `checked before every transaction`
>
> These terms are read by Gravitas Policy Registry before every transaction
> that depends on them. A transaction that would breach one does not execute —
> it is refused at the point of attempt rather than found afterwards.
>
> *There is no interval to drift in.*

**This is the centre of the demonstration.** A condition in an ordinary fatwa
is checked when somebody looks: next meeting, next quarter, at the audit.
Between those a pool can cross the line and trade for eleven weeks. Here there
is no between.

Then read the section headed **What Majlis cannot see** out loud. It says
Majlis does not write to the registry and that a decision taken here does not
itself change what is enforced. Reading your own limits aloud is what buys the
rest.

**If you have time, do the switch.** Delete `.env`, restart, reload the same
page. The identical panel now says *checked when somebody looks*, and explains
that a breach can stand for a quarter before the board hears of it. Same
screen, same terms, two different worlds — and the application is honest about
which one it is in.

### Step 4 — The consequence · same page, `CONSEQUENCE`

> **47 of 18,422 transactions would not have proceeded**

With three example transactions and the tangible ratio each of them had.

**What to land:** the board can see the effect of a ruling before making it.

**Say that this one is hand-written demonstration data.** It is the most
impressive number on the screen and it is seeded, not computed. Claiming
otherwise is the one thing that would lose a room of auditors.

### Step 5 — Drift · `/` (the home screen)

> Mixed pool — leased equipment and trade finance: tangible is **50.00%**,
> against the **51.00%** minimum this board set in matter-2026-04-02.
> **Does the standing ruling still hold?**

And below it:

> **THRESHOLDS NOTHING IS CHECKING** — `onBreach` does not say what part of a
> composition it is measured against, so nothing checks it.

**What to land:** it raises the question and does not re-rule. The status stays
`permitted` until the board says otherwise. And it names its own blind spot
without being asked.

### Step 6 — The ruling · `/matters/matter-2026-04-02` → **The ruling, written up**

A printable document: the question put to the board, what occurs, what this
does not decide, how it is implemented, the operative terms, and **each
member's reasoning attached to their vote**.

**What to land:** this is the deliverable. Everything before it exists to
produce it, and it is ready to print or send the moment the board closes the
vote.

### Step 7 — What it refuses · `/calculations`

Open **Tradability**. Nothing is ticked on *what this board counts on the
tangible side* — some boards count usufruct there, some count receivables
against. Show that entering a composition and a band returns the **board's own
sentence, quoted**, and that a proportion outside every band comes back as a
named gap rather than an answer.

**What to land, and it is the closing line:** the software computes and never
concludes. Every number it produces shows its working, and the ruling stays
where it belongs.

---

## 3. Questions that will be asked

**"Does this replace the board?"**
No. Nothing here signs. Majlis records what the board decided; whoever holds
the key carries it out, and that is a separate act by a separate person.

**"What if the model is wrong?"**
The assistant is off in this installation, and even where it is on it may not
state whether anything is permissible — three gates enforce that in code, not
in a prompt. Everything shown above is computed or quoted, not generated.

**"Can we work in Arabic?"**
The interface is translated and runs right-to-left. Be straight about the
state: a good deal of it still falls back to English, and the Arabic and Urdu
that exist need a native reviewer with knowledge of the subject before any
board uses them. This is an open item, not a finished one.

**"What happens to what we decided last year?"**
The record is append-only. A correction supersedes rather than overwrites, and
what stands is derived by following the chain of corrections — never by
timestamp. `/record` exports the year for audit.

**"Who can see our deliberation?"**
Isolation is at the store boundary, not in the routes, so one institution
cannot reach another's record even by mistake.

---

## 4. What not to claim

The demonstration is strong enough without any of these, and each of them is
recoverable only once.

- **Do not call the consequence figure computed.** It is seeded.
- **Do not say the protocol is under timelock governance.** Ownership still
  sits with the deployer.
- **Do not demonstrate upload or document-reading.** Both need configuration
  this installation does not have, and both are honestly absent rather than
  broken. Say they exist and are covered by tests.
- **Do not present the placeholder board as a real one.** Every screen says
  *illustrative*, and pretending otherwise undoes the credibility the rest of
  the application spends its whole design earning.
