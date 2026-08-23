## What this changes

<!-- One or two sentences. What is different afterwards, from the outside. -->

## Why

<!-- The problem, not the solution. If it fixes an issue, link it. -->

## How it was checked

<!-- What you actually ran, and what it said. "Tests pass" on its own is not a check. -->

- [ ] `forge test`
- [ ] `forge fmt --check`
- [ ] typecheck and build for any application touched

## Contracts

<!-- Delete this section if no Solidity changed. -->

- [ ] The deployed bytecode is **not** affected, or the change is queued for the next deployment
- [ ] Coverage did not fall
- [ ] Any new external call is guarded, and any new approval is reset after use

> Changing a deployed contract's source without redeploying puts the repository out of step with
> what is verified on Arbiscan. That gap is what the 23 August 2026 redeployment closed; do not
> reopen it by accident.

## Anything a reviewer should look at twice

<!-- Assumptions, trade-offs, things you were unsure about. -->
