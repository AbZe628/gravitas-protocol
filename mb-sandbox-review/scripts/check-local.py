#!/usr/bin/env python3
"""Local review probes only. No contract changes, hosted service or production adapter."""
import json
import os
from pathlib import Path
import subprocess
import urllib.request
import sys

NAMES = ("RPC", "OWNER", "EXECUTOR", "RECIPIENT", "UNKNOWN", "REGISTRY", "ASSET")
try:
    env = {name: os.environ[name] for name in NAMES}
except KeyError as exc:
    sys.exit(f"Missing {exc}. First source /tmp/mb-sandbox-env.sh")
if env["RPC"] != "http://127.0.0.1:8545":
    sys.exit("Refusing any RPC other than the dummy local Anvil address.")
OUT = Path(os.environ.get("MB_REVIEW_OUTPUT", "/tmp/mb-sandbox-run"))
OUT.mkdir(parents=True, exist_ok=True)

def cast(*args, fail=False):
    p = subprocess.run(["cast", *map(str, args), "--rpc-url", env["RPC"]], text=True, capture_output=True)
    if fail:
        assert p.returncode != 0, f"Unexpected success: {args}"
        return p.stderr
    assert p.returncode == 0, p.stderr
    return p.stdout.strip()

def rpc(method, params):
    body = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
    req = urllib.request.Request(env["RPC"], data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as response:
        result = json.load(response)
    assert "error" not in result, result
    return result["result"]

def send(target, signature, *args, caller=None):
    return json.loads(cast("send", target, signature, *args, "--unlocked", "--from", caller or env["OWNER"], "--json"))

def call(signature, *args, target=None, caller=None, fail=False):
    return cast("call", target or env["REGISTRY"], signature, *args, "--from", caller or env["EXECUTOR"], fail=fail)

def version():
    return int(call("currentVersion()(uint256)").split()[0])

def calldata(signature, *args):
    p = subprocess.run(["cast", "calldata", signature, *map(str, args)], text=True, capture_output=True, check=True)
    return p.stdout.strip()

assert cast("chain-id") == "31337"
assert "anvil" in rpc("web3_clientVersion", [])
assert version() == 3, "Use the fresh version-3 setup, not a modified scenario."
snapshot = rpc("evm_snapshot", [])
checks = []
try:
    # 1. A read-only check followed by a separate transfer, deliberately NOT atomic.
    block_tag = rpc("eth_blockNumber", [])
    call_object = {"from": env["EXECUTOR"], "to": env["REGISTRY"], "data": calldata("checkSubscriptionCompliance(address,address)", env["RECIPIENT"], env["ASSET"])}
    gate_result = rpc("eth_call", [call_object, block_tag])
    assert int(gate_result, 16) == 3
    assert "GPR: Asset not Shariah-compliant" in call("checkSubscriptionCompliance(address,address)(uint256)", env["RECIPIENT"], env["UNKNOWN"], fail=True)
    receipt = send(env["ASSET"], "transfer(address,uint256)", env["RECIPIENT"], 100 * 10**18)
    assert int(receipt["status"], 16) == 1
    tx_hash = receipt["transactionHash"]
    transfer_block = rpc("eth_getBlockByNumber", [receipt["blockNumber"], False])
    policy_hash = call("policyHistory(uint256)(bytes32)", 3)
    fixture = {
        "eth_chainId": "0x7a69",
        "eth_call": {
            "request": {"jsonrpc": "2.0", "id": 1, "method": "eth_call", "params": [call_object, block_tag]},
            "response": {"jsonrpc": "2.0", "id": 1, "result": gate_result}
        },
        "checkSubscriptionCompliance": {"subscriber": env["RECIPIENT"], "subscriptionToken": env["ASSET"], "policyVersion": "3"},
        "PolicyUpdated": {"version": "3", "policyHash": policy_hash},
        "Transfer": {"from": env["OWNER"], "to": env["RECIPIENT"], "value": str(100 * 10**18)},
        "eth_getTransactionReceipt": {k: receipt[k] for k in ("transactionHash", "blockNumber", "status", "from", "to", "logs")},
        "eth_getBlockByNumber": {k: transfer_block[k] for k in ("hash", "number", "timestamp")}
    }
    (OUT / "sample-audit-record.json").write_text(json.dumps(fixture, indent=2) + "\n")
    checks.append("1: check returns version 3; unapproved asset reverts; separate dummy transfer succeeds")

    # 2. Pair check: true only when both asset addresses are approved.
    assert call("areTokensCompliant(address,address)(bool)", env["ASSET"], env["ASSET"]) == "true"
    assert call("areTokensCompliant(address,address)(bool)", env["ASSET"], env["UNKNOWN"]) == "false"
    checks.append("2: approved/approved pair true; approved/unknown pair false")

    # 3. Caller is checked, subscriber is not.
    assert "GPR: Calling contract not an authorized executor" in call("checkSubscriptionCompliance(address,address)(uint256)", env["RECIPIENT"], env["ASSET"], caller=env["RECIPIENT"], fail=True)
    assert int(call("checkSubscriptionCompliance(address,address)(uint256)", env["UNKNOWN"], env["ASSET"]).split()[0]) == 3
    checks.append("3: unauthorised caller reverts; unregistered subscriber is not checked")

    # 4. Duplicate write preserves version; actual revoke advances it and changes hash.
    send(env["REGISTRY"], "setAssetCompliance(address,bool)", env["ASSET"], "true")
    assert version() == 3
    send(env["REGISTRY"], "setAssetCompliance(address,bool)", env["ASSET"], "false")
    assert version() == 4
    assert call("policyHistory(uint256)(bytes32)", 4) != policy_hash
    assert "GPR: Asset not Shariah-compliant" in call("checkSubscriptionCompliance(address,address)(uint256)", env["RECIPIENT"], env["ASSET"], fail=True)
    # A real bypass demonstration, not a claim about a missing protected sukuk token.
    bypass_receipt = send(env["ASSET"], "transfer(address,uint256)", env["RECIPIENT"], 10**18)
    assert int(bypass_receipt["status"], 16) == 1
    send(env["ASSET"], "approve(address,uint256)", env["EXECUTOR"], 10**18)
    delegated = send(env["ASSET"], "transferFrom(address,address,uint256)", env["OWNER"], env["RECIPIENT"], 10**18, caller=env["EXECUTOR"])
    assert int(delegated["status"], 16) == 1
    checks.append("4: duplicate stays v3; revoke creates v4; transfer AND transferFrom bypass failed check")

    # 5. Pause gates verification but not raw reads. Reapprove then pause.
    send(env["REGISTRY"], "setAssetCompliance(address,bool)", env["ASSET"], "true")
    before_pause = version()
    send(env["REGISTRY"], "pause()")
    assert call("paused()(bool)") == "true"
    for sig, args in [
        ("verifyAssetCompliance(address)(bool)", [env["ASSET"]]),
        ("areTokensCompliant(address,address)(bool)", [env["ASSET"], env["ASSET"]]),
        ("verifyRouterAuthorization(address)(bool)", [env["UNKNOWN"]]),
        ("verifyExecutorStatus(address)(bool)", [env["EXECUTOR"]]),
        ("checkSubscriptionCompliance(address,address)(uint256)", [env["RECIPIENT"], env["ASSET"]]),
    ]:
        error = call(sig, *args, fail=True)
        assert "EnforcedPause" in error or "0xd93c0665" in error, error
    assert call("isAssetCompliant(address)(bool)", env["ASSET"]) == "true"
    assert version() == before_pause
    paused_transfer = send(env["ASSET"], "transfer(address,uint256)", env["RECIPIENT"], 10**18)
    assert int(paused_transfer["status"], 16) == 1
    send(env["REGISTRY"], "unpause()")
    checks.append("5: all five guarded checks revert on pause; raw getter true; version unchanged; direct token transfer succeeds")

    # 6. Unauthorized ownership writes fail, including each policy register.
    for sig in ("setAssetCompliance(address,bool)", "setRouterAuthorization(address,bool)", "setExecutorStatus(address,bool)"):
        error = cast("send", env["REGISTRY"], sig, env["UNKNOWN"], "true", "--unlocked", "--from", env["RECIPIENT"], fail=True)
        assert "OwnableUnauthorizedAccount" in error or "0x118cdaa7" in error, error
    unchanged_version = version()
    unchanged_hash = call("policyHistory(uint256)(bytes32)", unchanged_version)
    send(env["REGISTRY"], "transferOwnership(address)", env["RECIPIENT"])
    assert call("owner()(address)").lower() == env["OWNER"].lower()
    assert call("pendingOwner()(address)").lower() == env["RECIPIENT"].lower()
    for sig in ("setAssetCompliance(address,bool)", "setRouterAuthorization(address,bool)", "setExecutorStatus(address,bool)"):
        error = cast("send", env["REGISTRY"], sig, env["UNKNOWN"], "true", "--unlocked", "--from", env["RECIPIENT"], fail=True)
        assert "OwnableUnauthorizedAccount" in error or "0x118cdaa7" in error, error
    cast("send", env["REGISTRY"], "acceptOwnership()", "--unlocked", "--from", env["EXECUTOR"], fail=True)
    assert version() == unchanged_version
    assert call("policyHistory(uint256)(bytes32)", unchanged_version) == unchanged_hash
    send(env["REGISTRY"], "acceptOwnership()", caller=env["RECIPIENT"])
    assert call("owner()(address)").lower() == env["RECIPIENT"].lower()
    assert call("pendingOwner()(address)").lower() == "0x0000000000000000000000000000000000000000"
    assert version() == unchanged_version
    checks.append("6: non-owner and pending owner cannot write any register; wrong acceptance fails; correct acceptance changes owner without changing version")
    (OUT / "results.json").write_text(json.dumps({"checks": checks, "directTransferBypassTransactionHash": bypass_receipt["transactionHash"], "delegatedTransferBypassTransactionHash": delegated["transactionHash"], "pausedDirectTransferTransactionHash": paused_transfer["transactionHash"], "note": "Local review probes only. No production integration or atomic transfer/version binding exists."}, indent=2) + "\n")
    print("\n".join("PASS " + c for c in checks))
    print(f"Local evidence: {OUT}")
finally:
    assert rpc("evm_revert", [snapshot]), "Could not restore local baseline"
    print("Restored local version-3 baseline.")
