# Architecture

What Majlis is, what it is made of today, and what it has to become.

Written against the code rather than against intention: every claim in the
present tense was checked in the source on 2 September 2026. The previous version
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

**272 server tests, 26 client.**

### Deployment

Render, one instance deliberately — the rate limiter and spend cap are in-process
and two instances keep two counts. Free tier, no disk: the record restarts from
the seed whenever the instance idles, and the application says so.

---

## 3. What is missing

### Critical — the record cannot justify itself

**3.1 The parameter hash has no input path.**
Every matter is created with `parameters: []` and `parameterHash: ''`, and no
route can set them. A carefully designed integrity mechanism — sorted keys,
excluded presentation, version tag, `parameterHashVerified` in the export — has
nothing to canonicalise.

The board can decide *permit this asset*. It cannot record *at a ratio of 30%,
measured quarterly, with a 30-day cure for drift*. That is
[open question 1](ROADMAP.md#open-questions) arriving as a gap in the software.

**3.2 Evidence cannot be attached.**
`Matter.sources` exists and only the seed fills it. A scholar can argue from an
AAOIFI standard for a week with nowhere to record which standard. For a board
whose output is reasoning, evidence that cannot be attached to the reasoning is
the largest ordinary gap here.

**3.3 The record cannot be searched.**
Matters split into open and settled. That is the whole of retrieval. A board with
two hundred decided matters that cannot find last year's has lost the thing this
was built to accumulate. **Precedent is the product.**

### Structural — it is not yet a product an institution can buy

**3.4 The chain is assumed, not adapted.** A bank board with no chain still gets
registry code, chain-shaped types and a dashboard describing Arbitrum.

**3.5 There is no institution.** `boardId` exists; a tenant that owns boards,
users, retention and branding does not. No bank shares a database with another
bank.

**3.6 Identity does not suit an institution.** Basic auth with a per-member
password. A bank requires SSO — OIDC or SAML — and a scholar will not manage
another credential.

**3.7 The assistant cannot be turned off or moved.** Deliberation text goes to a
US API. Some institutions will forbid that outright, and it must be a
configuration rather than a rebuild.

**3.8 No mobile application.** The web client is responsive. That is not the same
as an application a scholar has on the device they actually carry.

**3.9 No upload or download of documents.** Needs durable storage; building it
onto an ephemeral disk means silently losing a scholar's document.

### Ordinary

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
6. **Institution** as a tenant.

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
