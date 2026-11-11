# Clean-checkout reproduction

**Published code commit:** `54ad95b69daea4000bd71ab0be8a2e3b9e686fd2` on `cbar-azerbaijan-sandbox`.
**Checkout:** fresh HTTPS clone with `--recurse-submodules`; one submodule initialized. No repository files were changed by the test commands except the untracked local `.env` copied from `apps/majlis/.env.example`.

- Foundry: `forge fmt --check`, `forge build --sizes`, and `forge test -vv` passed; 86 tests passed, 0 failed, 0 skipped.
- Reviewer app: four Node tests passed; server and browser JavaScript syntax and route-manifest JSON checks passed.
- Majlis: clean `npm ci`, typecheck, 488 tests across 56 files, and production build passed.
- SDK: clean `npm ci`, 20 tests and TypeScript build passed; the install reported two high and two moderate development-tool advisories.
- Fresh-checkout reviewer server bound to `127.0.0.1:8790`; same-origin local T26 and T27 runs both returned `pass` with exit code 0. These execute local Foundry fixtures only and submit no testnet transaction.

Raw logs and exact runner responses are in the sibling `clean-checkout-*` files. The repository workflow is configured only for pushes to `main` and pull requests targeting `main`; a feature-branch push alone does not start GitHub Actions. No pull request was created as part of this delivery.
