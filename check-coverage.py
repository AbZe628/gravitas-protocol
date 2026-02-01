import json
import subprocess
import sys

def get_coverage():
    # Run forge coverage and capture output
    result = subprocess.run(['forge', 'coverage', '--report', 'summary', '--ir-minimum'], capture_output=True, text=True)
    lines = result.stdout.split('\n')
    
    core_contracts = [
        'contracts/GravitasPolicyRegistry.sol',
        'contracts/Teleport.sol',
        'contracts/TeleportV3.sol'
    ]
    
    coverage_data = {}
    for line in lines:
        for contract in core_contracts:
            if contract in line:
                # Extract percentage from line like "| contracts/Teleport.sol | 67.44% (29/43) | ..."
                parts = line.split('|')
                if len(parts) > 2:
                    pct_str = parts[2].strip().split('%')[0]
                    coverage_data[contract] = float(pct_str)
    
    return coverage_data

def main():
    coverage = get_coverage()
    print("Core Contract Coverage:")
    all_passed = True
    for contract, pct in coverage.items():
        status = "PASS" if pct >= 80 else "FAIL"
        print(f"{contract}: {pct}% - {status}")
        if pct < 80:
            all_passed = False
            
    if not all_passed:
        print("\nError: Coverage is below 80% on core contracts.")
        sys.exit(1)
    else:
        print("\nSuccess: All core contracts meet the 80% coverage threshold.")

if __name__ == "__main__":
    main()
