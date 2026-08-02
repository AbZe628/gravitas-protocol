# Architecture

## Shape

```
client (React 18 + Vite + Tailwind)
   │  typed API client, en/ar/ur with RTL
   ▼
server (Express + TypeScript)
   ├── seed record          illustrative board record
   ├── hash service         canonical parameter hashing
   ├── assistant service    two-gate constraint on rulings
   ├── registry service     viem read of Arbitrum Sepolia
   └── export service       audit artefact with integrity hash
```

No database. Stage One is read-only and the record is small; introducing storage before there is
anything to write would be premature. Stage Two adds a store for deliberation.

## Why the API has no write routes

The temptation in Stage One is to add "just a vote endpoint" so the flow can be demonstrated. That
would reproduce exactly the gap the system exists to close: a decision recorded in one place and
executed by someone else in another.

A test asserts that no write route exists. If a future change adds one before signing authority is
in place, that test fails. It is meant to.

## Parameter hashing

Canonicalisation rules, which must not change without a version bump:

- parameters sorted by key, ascending, byte order
- only `key` and `value` participate
- `meaning` and `unit` are presentation and are deliberately excluded, so a wording improvement does
  not invalidate an approval
- fields joined with separators that cannot appear in a key
- SHA-256, hex, `0x` prefixed
- the canonical string carries a version tag so the scheme can change without silent mismatch

The exclusion of `meaning` is a deliberate judgement and is worth challenging in review. The argument
for it: a board approves an operative rule, and improving the clarity of the human explanation of
that rule should not require the board to re-approve the rule itself. The argument against: the
explanation is what the scholar actually read.

## The asymmetry between restricting and permitting

`TIMELOCK_HOURS` in `server/src/types.ts`:

```ts
permit:   48   // slow by design
restrict:  0   // immediate; the safe direction
```

A delay protects when the change permits something. The same delay is a hazard when the change
restricts: two days of continued activity on an asset discovered to be non-compliant is not caution,
it is harm. Restriction therefore carries a reduced threshold and immediate effect, and must be
ratified by the full board within a defined window or it lapses.

## Chain reads

`server/src/services/registry.ts` reads the deployed Policy Registry through viem.

**The ABI is a minimal assumed interface and has not been verified against the deployed contract.**
Every read is best-effort. A failure is reported as a failure with its error string, never disguised,
and the application continues to serve the recorded data. The dashboard displays reachability
honestly rather than implying a successful read.

`OFFLINE_MODE=true` disables chain access entirely.

## Audit export

Produces a neutral JSON document readable without any knowledge of this application: rules in force
at a given date, decisions with votes and reasoning, dissent marked as a first-class fact, and an
integrity hash covering the payload. Each rule additionally carries `parameterHashVerified`; a value
of `false` means the record has been altered and the export should not be relied on.

## Testing

69 tests. The ones that matter most:

- `assistant: refuses to give rulings` — the constraint that carries the most weight, now three
  gates deep: a lexical check on the way in, a semantic classification call that reads intent, and a
  lexical check on the way out. The middle gate was added after manual testing found four of five
  indirect phrasings passed a two-gate design. All three fail closed.
- `parameter hashing` — order independence, presentation exclusion, duplicate rejection, version tag
- `exposes no route that writes a rule` — structural guarantee of Stage One
- `restricting quorum is lower than permitting quorum` — the asymmetry holds
