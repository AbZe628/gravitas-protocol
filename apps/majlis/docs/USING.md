# How this is used, and why it is currently harder than a Zoom call

The test this document exists to answer, put by the person paying for the work:

> *This is harder to do than getting on Zoom and making a PDF.*

That is correct today, and no amount of features fixes it. It is an
architectural problem with a specific cause and a specific answer, and both are
written out below.

Nothing here is a plan to remove anything. Every tool in Majlis earns its place
individually. The problem is the **shape of the work**, not the number of tools.

---

## 1. The honest count

One product approval. A commodity murabaha for retail deposits — the ordinary
case, not an exotic one.

### The incumbent

| | Who | What |
|---|---|---|
| 1 | Business unit | Emails the structure to the secretary |
| 2 | Board | Sixty minutes on a call |
| 3 | Someone | Drafts a PDF fatwa afterwards |
| 4 | Members | Read it, reply *agreed* |
| 5 | Chair | Signs |

**Scholar time: about ninety minutes**, and four of the five steps are things
they were doing anyway. The work is *talking*, which is what they trained for.

### Majlis today

| | Who | What | Into |
|---|---|---|---|
| 1 | Secretary | Title, the question, direction, what is not being decided | empty boxes |
| 2 | Liaison | The mechanism, step by step | an empty box |
| 3 | Scholar | Choose one contract shape from nineteen | a list |
| 4 | Scholar | Answer six conditions, each with a written reason | six empty boxes |
| 5 | Scholar | Attach each citation, one at a time | empty boxes |
| 6 | Scholar | State each operative term: key, value, unit, meaning | four boxes per term |
| 7 | Board | Deliberate | a thread |
| 8 | Signatory | Open the vote | one click |
| 9 | Each signatory | Vote **with written reasoning** | an empty box each |
| 10 | Signatory | Close the vote | one click |
| 11 | — | Forty-eight hours | — |

**Scholar time: considerably more than ninety minutes**, and almost every step
is authoring into a blank field. The work is *typing*, which is not what they
trained for.

### So the verdict is right

Majlis is currently **a data-entry system that produces an excellent record.**
The record is genuinely worth having. But the cost is paid entirely, up front,
by the scholar — and the beneficiaries are the institution, the auditor, and
whoever reads the record in three years.

**That is a bad trade to offer the person you need to say yes.**

---

## 2. What the call cannot do, ever

This is the other half of the ledger, and it is why the answer is not *"go back
to Zoom"*.

| | Zoom and a PDF | Majlis |
|---|---|---|
| Find last year's ruling on **this asset** | Search an inbox | It hangs off the asset |
| Prove which terms were voted on | Nobody can | Every position carries their hash |
| Know a ratio drifted in July | Nobody does, until the audit | It raises the question itself |
| Assemble the annual report | Reconstructed from memory | Already assembled |
| Show a regulator the reasoning | Six PDFs and an explanation | One export |
| Tell a new member why | Ask someone who was there | It is written down |
| Say how long the business waited | Nobody measures it | On every matter |

None of that is a feature anybody asked for and all of it is why an institution
buys this. **But a scholar does not experience any of it**, and a scholar is who
has to use it.

---

## 3. The cause, in one sentence

**Majlis asks the scholar to author, and then records what they authored.**

Every step in the table above starts from nothing. The fourth murabaha of the
year opens the same empty boxes as the first, and the board has answered these
conditions three times already.

The record is the *output* of a board's work. Majlis currently asks the board to
type the record, and calls that the work.

---

## 4. The inversion

**The system drafts. The board rules.**

That is the whole architecture change, and it does not remove a single control.
Every refusal stays exactly where it is: nothing signs, nothing rules, nothing
re-rules, the vote does not close itself, terms freeze when it opens. What
changes is what a scholar is looking at when they arrive — **a draft to correct
rather than a form to fill.**

A scholar correcting a draft is doing the thing they trained for: reading
somebody else's characterisation and saying where it is wrong. A scholar filling
a form is doing data entry.

### Where a draft can honestly come from

Three sources, all of them already in this repository, none of them used this
way.

**1. Precedent — `precedent.ts`.** It already finds prior matters sharing a
citation, a term, or a declared interaction, and it already refuses to relate
two matters on a resemblance. Today it renders as a *list of related matters* at
the bottom of the page. It should instead be the **source of the draft**: this
board ruled on a murabaha in March, so the April murabaha opens with March's
shape, March's conditions with the answers the board gave them, March's terms,
and March's *what is not being decided* — every one of them marked as inherited,
with the previous matter named, and every one of them editable.

**2. The library — `structures.ts`.** Nineteen contract shapes, each with its
conditions already written and cited to a standard. Choosing a shape already
attaches the checklist. It should also **propose the terms** that shape usually
carries, so the board is adjusting a threshold rather than inventing a schema.

**3. The document — `extraction.ts`.** Figures read out of the institution's own
paperwork, each carrying the sentence it came from. Built. Nothing else uses it.

### What the scholar's work becomes

| | Today | After the inversion |
|---|---|---|
| Contract shape | Choose from nineteen | Proposed from the question; confirm or change |
| Conditions | Answer six from blank | Six pre-answered from the last ruling; **answer by exception** |
| Operative terms | Type key, value, unit, meaning | Inherited; change the number that differs |
| What is not decided | Write from scratch | Inherited; add what is new here |
| Mechanism | Write from scratch | Inherited where the structure repeats; the liaison corrects |
| Vote with reasoning | Write from scratch | Still written. **This one must stay hard.** |

**The claim that has to be true for this product to be worth using:**

> *This is the fourth murabaha this board has ruled on. Here is what you decided
> the last three times. Three things differ.*

If Majlis can say that, it is faster than the call — because the call still
needs somebody to write the PDF afterwards, and this does not.

---

## 5. What must never get lighter

Kept here so the inversion is not read as a licence to smooth everything.

- **Voting with reasoning.** Never pre-filled, never suggested, never inherited.
  A tally of names without reasons is a show of hands, and a board that cannot
  say why it decided cannot be followed next time.
- **The vote does not close itself**, however complete the draft looks.
- **Answering a condition** may be pre-filled *from the board's own previous
  answer*, and from nothing else. Never from a model, never from another board.
- **An inherited field must say it is inherited**, and name what it came from.
  A draft that looked authored would be the record claiming a scholar wrote
  something they only failed to delete.

That last one is the line the whole inversion turns on. **Inherited and
unreviewed is a different state from decided**, and the record has to hold the
difference — otherwise this becomes a machine for producing rulings nobody read,
which is worse than the Zoom call by every measure that matters.

---

## 6. A genuinely new question is not cheaper, and should not be

The first sukuk this board ever rules on has no precedent to inherit. It costs
full price: the shape chosen, the conditions answered, the terms invented, every
citation attached by hand.

**That is correct.** A novel structure deserves the whole apparatus, and a
system that made it feel cheap would be lying about what was being decided. The
inversion pays back on the second one and every one after.

Say this plainly in a demonstration rather than being caught by it.

---

## 7. The order this gets built in

1. **Inherit from precedent.** The single change that decides whether this
   product is worth using. `precedent.ts` already finds the right matters; it
   needs to produce a draft rather than a reading list, and every inherited
   field needs to carry where it came from and the fact that nobody has looked
   at it yet.
2. **Answer by exception.** The checklist shows the previous answers, and the
   scholar touches the ones that differ. Its counter changes from *"0 of 6
   answered"* to *"6 inherited, none reviewed"* — a true statement about a
   different thing.
3. **Terms proposed by shape.** Choosing ijara should propose the terms an ijara
   usually carries, with the values empty.
4. **Delivery.** The fatwa is assembled and nothing takes it anywhere. The
   moment the institution stops waiting is the one moment nobody is told about.
5. **Notification.** A scholar currently finds out something needs them by
   opening the application.

Steps 1 and 2 are the product. Everything after is completion.

---

## 8. How to tell whether it worked

One measure, and it is not a survey.

> **The second ruling on a repeated structure takes a scholar less time than
> reading the PDF would have.**

If that is true, boards use it. If it is not, they go back to the call, and they
will be right to.
