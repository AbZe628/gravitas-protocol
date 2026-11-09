#!/usr/bin/env bash
# REFERENCE IMPLEMENTATION, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION.
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
REF="$ROOT/mb-sandbox-review/reference"
(cd "$REF" && forge test --match-path test/GatedDemoSukuk.t.sol --match-test '^testScenario07_|^testFuzz_Scenario07_' -vv)
bash "$REF/scripts/generate-audit-record.sh"
