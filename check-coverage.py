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
    cmd = ["forge", "coverage", "--ir-minimum", "--report", "summary"]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print("ERROR: forge coverage failed.")
        print("STDOUT:\n", result.stdout)
        print("STDERR:\n", result.stderr)
        sys.exit(1)

    return result.stdout


def parse_summary(summary: str):
    """
    Handles rows like:
    | contracts/Teleport.sol | 44.19% (19/43) | ...
    We extract the first float before the '%' in the "Lines" column.
    """
    coverage = {}

    for line in summary.splitlines():
        if "|" not in line:
            continue

        for contract in CORE_CONTRACTS:
            if contract in line:
                # Split table columns
                parts = [p.strip() for p in line.split("|")]

                # Find the first column that contains '%'
                # In foundry summary: column 2 is usually "% Lines"
                pct = None
                for col in parts:
                    if "%" in col:
                        m = re.search(r"(\d+(\.\d+)?)\s*%", col)
                        if m:
                            pct = float(m.group(1))
                            break

                if pct is not None:
                    coverage[contract] = pct

    return coverage


def main():
    summary = run_coverage()
    coverage = parse_summary(summary)

    print(f"Core Contract Coverage (threshold: {THRESHOLD:.0f}%):")

    missing = [c for c in CORE_CONTRACTS if c not in coverage]
    if missing:
        print("ERROR: Could not find coverage rows for:")
        for c in missing:
            print(f" - {c}")
        print("Raw coverage summary (for debugging):")
        print(summary)
        sys.exit(1)

    all_passed = True
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
