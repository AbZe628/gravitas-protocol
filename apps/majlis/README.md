# Gravitas Majlis

A governance and comprehension environment for Shariah boards supervising on-chain policy.

**This repository contains Stage One only: the record, the explanations, and the technological
briefings. It is read only. It carries no voting and no signing authority, and there is deliberately
no API route by which a rule can be created, amended or approved.**

---

## Why it exists

Gravitas Protocol makes an approved Shariah ruling enforceable at the moment of execution. That
solves one problem and creates another: if a rule now has direct operational force, the process by
which it is proposed, understood, debated and amended becomes the most sensitive part of the system.

Today that process is informal. A board discusses, a decision is minuted, someone conveys it to a
technical team, the technical team implements what it understood, and the board has no means of
confirming that what runs is what it decided. Every party acts in good faith and the gap remains.

Majlis is the environment in which the board understands, decides, and — from Stage Three — where
its decision *is* the operative act rather than an instruction to someone else.

The full concept, including the parts not yet built, is in
[`docs/CONCEPT.md`](docs/CONCEPT.md).

---

## The governing principle

> **The vote is the signature.**

A scholar's vote does not produce a recommendation which someone else then executes. From Stage
Three it produces the cryptographic signature which authorises the change in the Policy Registry
itself.

What is signed is a **hash of the exact operative parameters** as displayed at the moment of voting.
The question "was what the board approved the same as what was deployed" therefore reduces to a
comparison rather than to testimony. See [`server/src/services/hash.ts`](server/src/services/hash.ts).

---

## What is in Stage One

| | |
|---|---|
| **Matters** | Each with a plain-language brief, the operative parameters, what is *not* being decided, the mechanism, the simulation, and the deliberation record. |
| **Rules in force** | Every rule with its parameters, its hash, and a live verification that the two still match. |
| **Briefings** | A standing brief on technological change: what changed, why, which rules it touches, and a question for the board — never a conclusion. |
| **Assistant** | Explains mechanism in ordinary language, with sources. Structurally prevented from giving rulings. See [`docs/ASSISTANT-RULES.md`](docs/ASSISTANT-RULES.md). |
| **Record** | Retained explanations, and a one-action audit export with an integrity hash. |

Three languages at launch — English, Arabic, Urdu — with full right-to-left support.

---

## Running it

```bash
cp .env.example .env        # add ANTHROPIC_API_KEY for the assistant
npm install
npm run dev                 # server on :4000, client on :5173
```

Other commands:

```bash
npm test          # 69 tests across server and client
npm run build     # typecheck + production build
npm run typecheck
```

The application runs without an API key; only the assistant returns `502` without one.
Set `OFFLINE_MODE=true` to serve the recorded data and never contact the chain.

---

## Repository layout

```
server/
  src/
    types.ts               domain types — the shape of the record
    data/seed.ts           illustrative board record (replace before production use)
    services/hash.ts       canonical parameter hashing — what a scholar signs
    services/assistant.ts  the assistant and its structural constraints
    services/registry.ts   chain reads (ABI UNVERIFIED — see below)
    services/export.ts     audit export with integrity hash
    app.ts                 read-only API
  test/majlis.test.ts      59 tests

client/
  src/
    locales/               en / ar / ur with RTL
    lib/api.ts             typed API client
    lib/i18n.tsx           language context
    pages/                 Dashboard, MatterDetail, Rules, Briefings, Assistant, Record
  src/App.test.tsx         10 tests
```

---

## Two things that must be verified before production use

1. **The Policy Registry ABI in `server/src/services/registry.ts` is a minimal assumed interface and
   has not been checked against the deployed contract.** Replace it with the ABI emitted by the
   actual build and confirm each function exists with the signature given. Until then every chain
   read is best-effort, a failure is reported as a failure rather than disguised, and the application
   must never present an unverified read as confirmed.

2. **The Arabic and Urdu strings in `client/src/locales/index.ts` are a working baseline and must be
   reviewed by a native speaker with knowledge of the subject.** Terminology in Islamic finance is
   precise; a plausible translation is not a correct one.

**All content in `server/src/data/seed.ts` is fabricated demonstration data.** No part of it
represents the view, reasoning, vote or statement of any real scholar, board or institution. Board
members are deliberately unnamed placeholders and no reasoning in that file is attributable to a
named person. It exists so that a scholar opening the application sees the shape of the thing rather
than an empty shell, and so that every screen can be exercised in tests. Replace it entirely before
any production use.

---

## Roadmap

| Stage | Content |
|---|---|
| **One** *(this repository)* | Record, explanations, briefings. Read only. Useful to a board that has taken on no obligation. |
| Two | Matters, briefs, simulation and deliberation. Votes recorded; signing still outside the system. |
| Three | The vote becomes the signature. Threshold signing moves into Majlis. |
| Four | Multiple boards, cross-reference between them, published reference from the accumulated record. |

The principal risk is not technical. It is that scholars find it burdensome and do not use it, at
which point it is worth nothing regardless of its qualities. The sequence above is designed to earn
use before it requires it.

---

## Licence

BUSL-1.1 — see [`LICENSE`](LICENSE). Consistent with the Gravitas Protocol repository.
