#!/usr/bin/env bash
# REFERENCE IMPLEMENTATION, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION.
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
REF="$ROOT/mb-sandbox-review/reference"
(cd "$ROOT" && forge test --match-path test/foundry/PausableTests.t.sol --match-test '^test_Registry_' -vv)
(cd "$REF" && forge test --match-path test/GatedDemoSukuk.t.sol --match-test '^testScenario05_' -vv)
