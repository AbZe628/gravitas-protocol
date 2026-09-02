# Architecture

What Majlis is, what it is made of today, and what it has to become.

Written against the code rather than against intention: every claim in the
present tense was checked in the source on 2 September 2026, and again after each
step below. The previous version
of this document described an application with no write routes; Stage Two had
added twelve. **If a statement here stops matching the code, the code is right
and this file is a defect.**

---

## 1. What Majlis is

A Shariah board decides. Majlis is where the decision is taken, argued, evidenced,
recorded and made retrievable — so that *"is what runs what the board approved"*
is a comparison rather than testimony.

It is not a chat tool with a voting button. The product is **the record**: a
decision joined to its reasoning, its evidence, its dissent, and the mechanism it
attaches to.

### It is a stand-alone product

**Gravitas is one consumer of Majlis, not its purpose.** A Shariah board inside a
conventional bank — approving products, screening assets, ruling on structures —
has the same problem and no chain anywhere near it. That board is the larger
market and the nearer one.

Two consequences that reach into every layer:

- **The chain is an adapter, not an assumption.** Everything core — the record,
  deliberation, evidence, parameters, voting, export — must work with no chain
  configured at all. The Policy Registry is one adapter among others.
- **For most institutions this is a Web2 application** that happens to be able to
  enforce a decision on chain, later, if they ever want that. It is a scholar's
  first contact with Web3 by being useful without it first.

### Nothing here signs

`/api/health` reports `signingAuthority: false` with a test pinning it. A
decision is recorded; executing it on chain is Stage Three.

---

## 2. What exists today

### Shape

```
client  React 18 · Vite · Tailwind · react-router
  │     en / ar / ur with RTL · typed API client
  ▼
server  Express · TypeScript
  ├── store         JSON document, atomic temp+rename, mutations queued
  ├── lifecycle     every transition and every refusal
  ├── attention     what is waiting for you
  ├── search        retrieval, with an explainable ranking
  ├── precedent     what the board already decided about this
  ├── enforcement   adapter · none by default
  ├── comprehension adapter · off by default
  ├── assistant     three-gate constraint against rulings
  ├── hash          canonical parameter hashing
  ├── registry      viem read of the deployed Policy Registry
  ├── export        audit artefact with integrity hash
  ├── sweep         deadlines pass whether or not anyone is looking
  └── limits        rate and spend caps
```

### The record

| Type | Carries |
|---|---|
| `Board` | members, quorum for permit and restrict, ratification window |
| `Scholar` | id, name, title, whether a signatory |
| `Matter` | title, origin, direction, status, proposal, mechanism, what is *not* decided, deliberation, reasoning, objections, timelock, sources, proposed rule |
| `Rule` | statement, parameters, parameter hash, version, in force from, supersedes |
| `Deliberation` | who, what, when, reply-to, whether a liaison answer |
| `Reasoning` | who, position, written reason, when, released-at |
| `Briefing` | standing brief on technological change |

### Lifecycle

```
draft → deliberation → voting → timelock → in_force → lapsed
  ↑         ↑    └──────────┘        └──→ rejected
  └─────────┴──→ withdrawn
```

A transition table with no default-allow branch. Refusals carry a code so the
interface answers the kind, not the prose.

**The asymmetry holds.** Permitting is slow: full quorum, 48-hour timelock, any
one signatory halts it. Restricting is immediate at reduced quorum, then ratified
within a window or it lapses. A delay protects when a change permits; the same
delay is harm when it restricts.

### Roles, routes, tests

`signatory` · `advisory` · `liaison` · `observer`. Deliberating is open to the
first three; voting and objecting belong to signatories. Without
`MAJLIS_MEMBERS` every credential is an observer.

12 governance routes, each applying its change inside `store.updateMatter` so the
rules run against the stored matter in a transaction and a refusal writes nothing.

**328 server tests, 26 client.**

### Deployment

Render, one instance deliberately — the rate limiter and spend cap are in-process
and two instances keep two counts. Free tier, no disk: the record restarts from
the seed whenever the instance idles, and the application says so.

---

## 3. Where it stands

Five of the gaps this document opened with are closed. What follows is what is
true now, not what was true when it was written.

### Closed

**3.1 The operative terms can be set, and the hash means something.** A matter
carried an empty parameter list and an empty hash that no route could fill, so
the canonicalisation design had nothing to work on. The terms are now set while
the matter is worked out and **frozen when the vote opens** — a set of terms
that can move under a standing position is not a set anyone can be said to have
approved. Every position carries the hash it was taken against, so *did this
member approve these exact terms* is a comparison. Returning a matter to
deliberation clears the hash and each released position keeps the one it was
cast against.

**3.2 Evidence attaches.** Attributed and timed, open to anyone who may
deliberate — an advisory member who knows the standard should be able to put it
in front of the board without holding the authority to decide. Withdrawn rather
than deleted and only by whoever attached it: one member deleting another's
citation is not a correction. Evidence closes when the matter closes.

**3.3 The record can be searched.** Across title, proposal, mechanism, what was
expressly not decided, the rule, the terms, the evidence, every position and
every line of deliberation — narrowed by status, direction, origin, board, date
and by the member who took part. **The ranking is explainable on purpose**:
every result names the field the words were found in and shows the text, because
a score nobody can account for is the wrong instrument for a record whose claim
is that it can be checked.

**Precedent** comes with it, and every relation is a fact in the record rather
than a resemblance: the same citation, a declared interaction, the same
operative term. The interface names the specific thing shared.

**3.4 The chain is an adapter.** `MAJLIS_ENFORCEMENT` defaults to nothing.
Nothing here ever *performs* enforcement — an adapter reports what the enforcing
system says, so a board can see whether what runs matches what it approved.

**3.7 The assistant is an adapter.** `MAJLIS_ASSISTANT` defaults to off. A
board's deliberation is among the most sensitive text an institution holds and
some will forbid sending it anywhere; that is a configuration, not a rebuild.
An installation that quietly started sending deliberation to a third party
because a key happened to be in the environment would be the wrong default.

**An installation with neither attached is the ordinary one.** The navigation
stops offering an assistant that is not there; the dashboard says nothing is
attached rather than showing an empty address and an unreachable badge; the boot
log states both. Twelve tests hold that.

Both are inferred from existing configuration, so no running installation lost
anything on upgrade.

### Still open

**3.5 There is no institution.** `boardId` exists; a tenant owning boards,
users, retention and branding does not. No bank shares a database with another
bank. **This is the next structural piece.**

**3.6 Identity does not suit an institution.** Still a password per member. A
bank requires OIDC or SAML, and a scholar will not manage another credential.
Storage has been an adapter since the store interface; identity has not been
made one.

**3.8 No mobile application.** The web client is responsive. That is not an
application on the device a scholar carries.

**3.9 No upload or download of documents.** Needs durable storage. The
`SourceRef` shape already carries a `file` field, unused, so an uploaded
document becomes a source of the same shape and nothing written now needs
migrating.

**3.10** The assistant is a separate page, not attached to the matter being read.
**3.11** `Matter.simulation` is always `null`; nothing produces one.
**3.12** Nobody is told anything outside the application — no email, no digest.
**3.13** A member cannot correct their own comment.
**3.14** The concept names **chair**, **institution administrator** and
**auditor**; code has none. A chair who cannot convene or close a discussion is a
board with no procedure.

---

## 4. What it must become

The test for every addition: **does this reduce the work a scholar has to do, or
increase the trustworthiness of the record?** If neither, it does not belong.

### 4.1 Target shape

```
                    ┌──────────────┐   ┌──────────────┐
  web (React)  ───▶ │              │   │  identity    │  password · OIDC · SAML
  mobile (RN)  ───▶ │   API        │◀──┤  adapter     │
                    │              │   └──────────────┘
                    │  ── core ──  │   ┌──────────────┐
                    │  record      │   │  storage     │  filesystem · S3
                    │  lifecycle   │◀──┤  adapter     │
                    │  evidence    │   └──────────────┘
                    │  parameters  │   ┌──────────────┐
                    │  search      │   │  enforcement │  none (default)
                    │  export      │◀──┤  adapter     │  Gravitas registry
                    └──────────────┘   └──────────────┘
                            │          ┌──────────────┐
                            └─────────▶│  assistant   │  off (default) · hosted
                                       │  adapter     │  · self-hosted model
                                       └──────────────┘
```

**Core knows nothing about a blockchain, a vendor or a model.** Everything an
institution might refuse, forbid or already own sits behind an adapter with a
null implementation that is the default.

That is what makes it sellable to a bank *and* keeps Gravitas working: Gravitas
configures the enforcement adapter; a bank leaves it off.

### 4.2 Mobile

A scholar reads matters on a phone, in the evening, sometimes without signal.

**React Native via Expo, sharing the API client and types with the web client.**
Not a second codebase and not a wrapper around the website:

- **Offline reading.** The record cached locally; a matter opened on a plane.
- **Queued actions.** A comment written offline sends when there is signal, and
  says it is queued rather than pretending it was sent.
- **Push notification**, which is the one channel a board actually reads.
- **Documents** viewable in the app rather than downloaded and lost.
- **Biometric unlock**, because a scholar will not type a password to read a
  thread.

### 4.3 Identity

Password today; **OIDC and SAML** for institutions. The bank's directory decides
who is on a board. Attribution stays absolute: a shared credential authenticates
as an observer, whatever the source.

### 4.4 Documents

Upload a fatwa, a standard, an opinion, a term sheet. Attached to a matter as
evidence, viewable in place, downloadable, retained under the institution's
policy. Where the assistant is enabled, it reads them — and where it is not, the
document is still evidence.

Storage behind an adapter: local filesystem for a bank on its own hardware, S3 or
compatible for hosted. **Not built until a volume exists**, and the data model
already carries the field so nothing written now needs migrating.

### 4.5 Automation

Only where it removes work, never where it decides anything.

- Deadlines swept and surfaced *(exists)*
- Digests: what is waiting, what changed, what expires this week
- Reminders before a ratification window closes
- Quorum watch: who has not yet recorded a position
- Automatic supersession: a rule in force marked superseded when its replacement
  carries
- Scheduled export to the institution's archive

### 4.6 Ordered plan

**First — make the record complete.** Without these it records decisions it
cannot justify.
1. **Evidence** — attributed, withdrawable only by whoever attached it, closed
   when the matter closes, shaped so a file later becomes the same thing.
2. **Parameters** — draft the operative terms, hash on carrying, hold the
   approved hash against what is enforced.

**Second — make it retrievable.** Accumulation without retrieval is a pile.
3. **Search** across matters, rules and reasoning.
4. **Precedent** — from a matter, reach adjacent decisions.

**Third — make it stand alone.**
5. **Adapters** — enforcement, assistant, storage, identity; null by default.
   *Enforcement and assistant are done.* `MAJLIS_ENFORCEMENT` and
   `MAJLIS_ASSISTANT` both default to nothing, and an installation with neither
   is the ordinary one: the navigation stops offering an assistant that is not
   there, and the dashboard says nothing is attached rather than showing an
   empty address and an unreachable badge. Both are inferred from existing
   configuration so no running installation lost anything on upgrade. Storage
   has been an adapter since the store interface; **identity has not been done**
   — it is still a password per member, and an institution needs OIDC or SAML.
6. **Institution** as a tenant. Not started: `boardId` exists, a tenant owning
   boards, users, retention and branding does not.

**Fourth — reduce the work.**
7. Assistant in context of a matter · what changed since you last looked ·
   correct your own words · digests.

**Fifth — reach the device.**
8. Mobile application, offline, push, documents.

**Sixth — procedure.** Chair, agenda, convening. Needs the concept's answer on
authority before code.

---

## 5. Decisions already taken

Settled, and not to be re-litigated without a reason:

- **The vote is not the signature yet.** Stage Three, and not before a board has
  used the earlier stages.
- **Released, not deleted.** A released vote, a withdrawn source: what a member
  said is part of how the board arrived.
- **Attribution or nothing.** A shared credential is an observer, because a vote
  that cannot be attributed records nothing.
- **The assistant never rules.** Three gates, failing closed.
- **Reasoning is compulsory.** A position with nothing attached cannot be
  reviewed, cited or disagreed with.
- **`boardId` on everything.** Plurality assumed from the first line: systems
  that assume one truth cannot be persuaded to hold several.
- **Refusals carry codes**, so the interface answers the kind and not the prose.
- **Core depends on nothing an institution might refuse.**

---

## 6. Design notes that still hold

### Parameter hashing

Parameters sorted by key ascending in byte order; only `key` and `value`
participate; `meaning` and `unit` excluded as presentation, so improving a
wording does not invalidate an approval; fields joined with separators that
cannot appear in a key; SHA-256, hex, `0x` prefixed; a version tag in the
canonical string. **Must not change without a version bump.**

The exclusion of `meaning` is a deliberate judgement worth challenging. For: a
board approves an operative rule, and clarifying its explanation should not
require re-approval. Against: the explanation is what the scholar actually read.

### Chain reads

`services/registry.ts` asks the deployed registry two things — whether it is
paused and who owns it — both checked against the deployed contract at
`0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23` on 24 August 2026. Anything added
must be checked the same way: an assumed signature does not fail loudly, it
decodes to a value that means nothing.

Reads are best-effort; a failure is reported as a failure. `OFFLINE_MODE=true`
disables chain access, and under the target shape that becomes the default.

### Audit export

A neutral JSON document readable without knowledge of this application: rules in
force at a date, decisions with votes and reasoning, dissent as a first-class
fact, and an integrity hash over the payload. `parameterHashVerified: false`
means the record has been altered and the export should not be relied on.

---

## 7. What stays out

- **Anything that signs.** Until Stage Three.
- **Anything that implies a ruling** — including the assistant estimating,
  ranking, comparing against a standard, or reporting another board's decision as
  though it settled the question.
- **Silent behaviour.** A reset, a stale read, a missing credential, a refused
  action: each stated where it happens.
- **A second instance**, until the rate limiter and spend cap move to shared
  state.
- **A core dependency on any vendor.** If an institution can refuse it, it is an
  adapter.
