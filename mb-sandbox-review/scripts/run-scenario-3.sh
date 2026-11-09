#!/usr/bin/env bash
# REFERENCE IMPLEMENTATION, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION.
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
REF="$ROOT/mb-sandbox-review/reference"
(cd "$ROOT" && forge test --match-path test/GravitasSubscriptionIntegration.t.sol --match-test '^test_CheckSubscriptionCompliance_RevertOnNonCompliantAsset|^test_CheckSubscriptionCompliance_RevertOnUnauthorizedExecutor' -vv)
(cd "$REF" && forge test --match-path test/GatedDemoSukuk.t.sol --match-test '^testScenario02_|^testScenario03_' -vv)
