# Known limitations and open risks

This is an internal technical review, not an independent security audit. The following items must remain visible in any reviewer or institutional materials.

## Governance and control

Majlis has application-level proposals, reasoning, votes/quorum and lifecycle records, but no verified transaction writer that turns its result into a signed Registry update. Hashes are data-integrity commitments, not cryptographic approvals. Seeded institutions, boards, members and decisions are demonstrative data only.

On the observed Arbitrum Sepolia snapshot, Registry and TeleportV2/TeleportV3 are owned by `0xFba6C221af564Ab90e333AEEf4E427f787911B73`; Registry `pendingOwner()` is zero. The deployed Timelock minimum delay is 300 seconds, the observed owner has the proposer role, and the zero address has the executor role (open execution). The Registry and engines are not owned by the Timelock. This is a short delay and does not evidence a multisig governance handover.

`checkSubscriptionCompliance(subscriber, subscriptionToken)` does not inspect `subscriber`. Registry asset flags are allow-list state only; there is no KYC, sanctions screening, beneficial-owner verification, accreditation, suitability or investor eligibility feature.

## Teleport V2

V2 is a same-chain LP migration, not a bridge or cross-chain settlement service. It relies on a caller-supplied factory/pair and an authorized router, and the project states that Arbitrum Sepolia has no usable V2 DEX route. It has no V2-specific pause method; the Registry pause is enforced only because callers query the Registry. V2 and V3 engine ownership uses single-step `Ownable`; a mistaken transfer is not protected by two-step acceptance.

## Teleport V3

V3 migrates a V3 position to a new position and does not preserve the original token ID. It does not provide cross-chain migration. The source `amount0MinDecrease`/`amount1MinDecrease` lack a nonzero floor even though mint minima must be nonzero; the signed intent constrains the values, but an owner may sign a zero withdrawal floor. V3 accepts ERC-721s through `onERC721Received` without a general rescue path, so an NFT sent directly can be stranded. No separate emergency pauser exists; when owned by a timelock, an owner-only pause would itself be delayed.

The live tests are local mock-based transactions, not a live Uniswap integration or production liquidity rehearsal. Deployed bytecode/source equivalence to the exact repository commit has not been independently established in this pass.

## SDK and API

The SDK performs reads, simulation and calldata construction, not wallet signature production or transaction submission. A compliance read path may expose a raw paused-registry revert rather than a normalized pause-specific error. The integration-kit mock reads fixture JSON and appends JSONL logs; it does not query the live Registry. It binds to loopback but lacks the API-key authentication declared in OpenAPI. Its six local examples are simulated fixture outcomes. The SDK's 20 unit tests and TypeScript build pass after a Zod 4.6.7 update; four npm advisories remain in its Vitest/Vite development dependency tree, and the attempted compatible patch update failed in npm's resolver.

## Operations, legal and regulatory

No independent security audit, formal certification or Shariah ruling is claimed. The project has no Azerbaijan-registered legal entity. The 25 June–25 August 2026 CBAR third-cycle window is closed; no current open window is evidenced in reviewed official sources. No application, partnership, endorsement or regulator contact is claimed. Market, oracle, liquidity, governance, legal, custody, privacy and operational risks remain outside single-transaction atomicity.

## Evidence caveats

The RPC snapshot is point-in-time and was obtained from PublicNode after the Arbitrum public endpoint returned HTTP 403 from this sandbox. It must be cross-checked with an independent provider for institutional reliance. Explorer source/ABI visibility does not itself establish exact bytecode equivalence to the audited source commit. Existing test counts do not imply every test in the requested 36-case catalogue was run; the catalogue identifies gaps explicitly.

Primary repository issue register: [`../KNOWN-ISSUES.md`](../KNOWN-ISSUES.md). Deployment claims in older docs should be checked against current source and live reads before use.
