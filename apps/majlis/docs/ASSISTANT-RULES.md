# The comprehension assistant: constraints

The assistant exists because the alternative — a scholar ruling on a mechanism he was given no fair
opportunity to understand — is worse than the risk it introduces.

But the risk is real, and it is precisely the risk the whole system exists to address: **a faithful
ruling founded on an unfaithful explanation.** A wrong explanation does not fail loudly. It produces
a confident scholar who rules correctly on a mechanism that does not exist.

The four constraints below are therefore structural. They are enforced in code rather than left to
the model's discretion on the day. All are implemented in
[`server/src/services/assistant.ts`](../server/src/services/assistant.ts) and tested in
[`server/test/majlis.test.ts`](../server/test/majlis.test.ts).

---

## 1. It does not give rulings

The assistant describes mechanism. It does not state, imply, suggest or estimate whether something is
permissible, and it does not summarise the fiqh positions of others in a way that functions as an
answer to the question being asked.

**Three gates.**

*Before the model is called.* Questions matching known ruling-seeking patterns are refused without
the model ever running. A refusal must not depend on how the model is feeling about the request.

```
Is this halal?                          → refused, model never called
Does this involve riba?                 → refused, model never called
Should the board approve this asset?    → refused, model never called
How should we vote on this?             → refused, model never called
```

*A semantic classification, before the main model.* Gates that match words cannot catch a request
whose words are innocent. Manual testing found that four of five indirect phrasings passed a
two-gate design — for example "summarise what scholars generally hold" or "list the considerations
that would suggest permissibility". A separate, cheap classification call now reads the intent of
every question that survives the lexical gate, and answers YES or NO to whether the question seeks
an evaluation. Anything that is not an unambiguous NO is refused.

This gate **fails closed**. Where the classifier cannot be reached, the question is refused rather
than answered, and the refusal says exactly that rather than pretending the question sought a
ruling. A refusal is recoverable; a ruling is not.

*After the model returns.* If ruling language survives into the output, the answer is discarded
entirely and the question is escalated to the technical liaison. We would rather return nothing than
return a ruling.

```
"…This is halal and the board may approve it."   → answer discarded, escalated
"From a Shariah perspective, this is acceptable" → answer discarded, escalated
"Most scholars hold that…"                       → answer discarded, escalated
```

A refusal is not a dead end. It offers what the assistant can properly do: set out the mechanism the
ruling would attach to, so the scholar can rule with the facts in front of him.

## 2. Every explanation carries its source

Each answer links to the specific code, test or documentation it derives from. Repository paths are
extracted from the answer and surfaced beneath it, so the scholar can verify the ground of any
statement and is never asked to accept an explanation on the assistant's authority — which it does
not have.

Where the assistant relies on general knowledge of how a public protocol works rather than on
something verified in this codebase, it is instructed to say so explicitly. It is instructed never to
invent a file path, a test name or a line reference.

## 3. Everything is retained

Explanations are part of the permanent record and are visible under **Record**. If an explanation is
later found to be wrong, it is possible to identify precisely which decisions rested on it and to
reopen them.

Without this property an error becomes undiscoverable, which is the condition under which errors
become serious.

## 4. Uncertainty is escalated, not smoothed

Where the assistant is not confident it says so in the answer itself, and the exchange is flagged for
referral to the technical liaison, who answers in writing within the record.

A correct answer tomorrow is worth more than a fluent answer now. The failure mode being guarded
against is the model resolving ambiguity by choosing the more plausible reading and presenting it as
settled.

---

## What the system prompt does and does not do

The system prompt sets tone, register and the instruction not to rule. It is necessary and it is not
sufficient. A system prompt is a request; the gates above are a constraint. Any future change to the
assistant must preserve the gates even if the prompt is rewritten entirely.

## If you are reviewing this

The tests to read first are those under `assistant: refuses to give rulings`. They assert that:

- ten distinct direct phrasings are caught before any model runs
- ten distinct **indirect** phrasings are caught, including the class found in manual testing
- five mechanical questions are *not* caught, so the assistant remains useful
- the model is genuinely never called on a refused question
- an ambiguous classifier reply is treated as a ruling request
- the semantic gate fails closed when the classifier is unreachable, and says so honestly
- a lexically innocent question the classifier flags never reaches the main model
- an answer containing a ruling is discarded even when the model produced it
- a clean mechanical answer passes through and its sources are extracted

59 server tests in total.
