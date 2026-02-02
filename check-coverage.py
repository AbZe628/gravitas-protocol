import subprocess
import sys
import re

CORE_CONTRACTS = [
    "contracts/GravitasPolicyRegistry.sol",
    "contracts/Teleport.sol",
    "contracts/TeleportV3.sol",
]

THRESHOLD = 80.0


def run_coverage() -> str:
    """
    Generate coverage summary deterministically in CI.
    We use the same flags as CI uses to avoid stack-too-deep issues:
      - FOUNDRY_PROFILE=coverage (set in CI step)
      - --ir-minimum (recommended by solc / foundry for coverage)
    """
    cmd = ["forge", "coverage", "--ir-minimum", "--report", "summary"]
    result = subprocess.run(cmd, capture_output=True, text=True)

    # forge returns non-zero on some internal failures; surface it clearly
    if result.returncode != 0:
        print("ERROR: forge coverage failed.")
        print("STDOUT:\n", result.stdout)
        print("STDERR:\n", result.stderr)
        sys.exit(1)

    return result.stdout


def parse_summary(summary: str):
    """
    Parses forge coverage --report summary output.
    The summary is a table with '|' separators.
    We look for the row containing the contract path and read the percent column.
    """
    coverage = {}

    for line in summary.splitlines():
        if "|" not in line:
            continue

        for contract in CORE_CONTRACTS:
            if contract in line:
                parts = [p.strip() for p in line.split("|") if p.strip()]
                # Typical format: file | line% | stmt% | branch% | func%
                # Some versions: file | lines% | statements% | branches% | functions%
                # We'll take the first percentage we find after the filename column.
                # parts[0] is usually filename. Next columns contain percentages.
                pct = None
                for p in parts[1:]:
                    m = re.match(r"^(\d+(\.\d+)?)%$", p)
                    if m:
                        pct = float(m.group(1))
                        break

                if pct is not None:
                    coverage[contract] = pct

    return coverage


def main():
    summary = run_coverage()
    coverage = parse_summary(summary)

    print("Core Contract Coverage (threshold: 80%):")
    all_passed = True

    # Ensure we found all core contracts in the summary
    missing = [c for c in CORE_CONTRACTS if c not in coverage]
    if missing:
        print("\nERROR: Could not find coverage rows for:")
        for c in missing:
            print(f" - {c}")
        print("\nRaw coverage summary (for debugging):\n")
        print(summary)
        sys.exit(1)

    for contract in CORE_CONTRACTS:
        pct = coverage[contract]
        status = "PASS" if pct >= THRESHOLD else "FAIL"
        print(f"{contract}: {pct:.2f}% - {status}")
        if pct < THRESHOLD:
            all_passed = False

    if not all_passed:
        print(f"\nERROR: Coverage below {THRESHOLD:.0f}% for at least one core contract.")
        sys.exit(1)

    print(f"\nSUCCESS: All core contracts meet the {THRESHOLD:.0f}% coverage threshold.")
    sys.exit(0)


if __name__ == "__main__":
    main()
