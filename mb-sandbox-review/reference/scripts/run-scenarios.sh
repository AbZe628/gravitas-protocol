#!/usr/bin/env bash
# REFERENCE IMPLEMENTATION, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION.
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)"
for n in 1 2 3 4 5 6 7; do bash "$ROOT/mb-sandbox-review/scripts/run-scenario-${n}.sh"; done
