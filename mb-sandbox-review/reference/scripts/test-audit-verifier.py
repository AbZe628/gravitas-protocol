#!/usr/bin/env python3
"""Negative tests for the audit verifier using the just-generated local Anvil transaction."""
import copy
import json
import os
import subprocess
import sys
import tempfile
import threading
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from Crypto.Hash import keccak

REF = Path(__file__).resolve().parents[1]
PACKAGE = REF.parent
ROOT = PACKAGE.parent
DEPLOY = json.loads((REF / 'deployments' / 'local.json').read_text())
RECORD_PATH = Path(os.environ.get('AUDIT_RECORD_OUT', str(PACKAGE / 'reference-audit-record.json')))
RPC_URL = os.environ.get('RPC_URL', 'http://127.0.0.1:8545')
CHAIN_ID = os.environ.get('EXPECTED_CHAIN_ID', '31337')
CONFIRMATIONS = os.environ.get('AUDIT_CONFIRMATIONS', '1')
RECORD = json.loads(RECORD_PATH.read_text())


def keccak_topic(signature):
    digest = keccak.new(digest_bits=256)
    digest.update(signature.encode())
    return '0x' + digest.hexdigest()


def verifier_command(record_path, rpc_url=RPC_URL, expected_chain=CHAIN_ID):
    return [
        sys.executable, str(REF / 'scripts' / 'verify-audit-record.py'),
        '--rpc-url', rpc_url, '--expected-chain-id', str(expected_chain),
        '--confirmations', str(CONFIRMATIONS), '--registry', DEPLOY['registry'],
        '--manager', DEPLOY['manager'], '--token', DEPLOY['gatedToken'],
        '--record', str(record_path),
    ]


def run_verifier(record_path, rpc_url=RPC_URL, expected_chain=CHAIN_ID, should_pass=False, label='verification'):
    result = subprocess.run(verifier_command(record_path, rpc_url, expected_chain), text=True, capture_output=True)
    if should_pass and result.returncode != 0:
        raise RuntimeError(f'{label} should pass but failed:\n{result.stdout}\n{result.stderr}')
    if not should_pass and result.returncode == 0:
        raise RuntimeError(f'{label} should fail but passed:\n{result.stdout}\n{result.stderr}')
    return result


class RpcProxyHandler(BaseHTTPRequestHandler):
    def do_POST(self):  # noqa: N802 - BaseHTTPRequestHandler API
        request = json.loads(self.rfile.read(int(self.headers.get('content-length', '0'))))
        try:
            data = json.dumps(request).encode()
            proxy_request = urllib.request.Request(self.server.origin, data, {'Content-Type': 'application/json'})
            with urllib.request.urlopen(proxy_request, timeout=10) as response:
                payload = json.load(response)
        except Exception as error:  # pragma: no cover - diagnostic path
            self.send_error(502, str(error))
            return
        mode = self.server.mutation
        result = payload.get('result')
        if request['method'] == 'eth_getTransactionReceipt' and isinstance(result, dict):
            logs = result.get('logs', [])
            manager_index = int(RECORD['events']['managerTransferChecked']['logIndex'])
            token_index = int(RECORD['events']['erc20Transfer']['logIndex'])
            if mode == 'missing_manager_event':
                result['logs'] = [log for log in logs if int(log['logIndex'], 16) != manager_index]
            elif mode == 'missing_token_event':
                result['logs'] = [log for log in logs if int(log['logIndex'], 16) != token_index]
            elif mode == 'cross_transaction_events':
                for log in logs:
                    if int(log['logIndex'], 16) == token_index:
                        log['transactionHash'] = '0x' + 'ff' * 32
            elif mode == 'bad_receipt_block_hash':
                result['blockHash'] = '0x' + 'ee' * 32
        elif request['method'] == 'eth_getLogs' and isinstance(result, list) and mode == 'policy_history_gap':
            policy_topic = keccak_topic('PolicyUpdated(uint256,bytes32)')
            removed = False
            filtered = []
            for log in result:
                if not removed and log['topics'][0].lower() == policy_topic.lower():
                    removed = True
                    continue
                filtered.append(log)
            result[:] = filtered
        payload['result'] = result
        encoded = json.dumps(payload).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, *_args):
        return


def run_with_proxy(mode):
    server = ThreadingHTTPServer(('127.0.0.1', 0), RpcProxyHandler)
    server.origin = RPC_URL
    server.mutation = mode
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    endpoint = f'http://127.0.0.1:{server.server_port}'
    try:
        with tempfile.TemporaryDirectory(prefix='audit-verifier-rpc-mutation-') as directory:
            record_path = Path(directory) / 'record.json'
            record_path.write_text(json.dumps(RECORD))
            run_verifier(record_path, rpc_url=endpoint, should_pass=False, label=mode)
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)


def main():
    if not RECORD_PATH.is_file():
        raise SystemExit(f'missing generated real local audit record: {RECORD_PATH}')
    with tempfile.TemporaryDirectory(prefix='audit-verifier-record-mutation-') as directory:
        original = copy.deepcopy(RECORD)
        original_path = Path(directory) / 'original.json'
        original_path.write_text(json.dumps(original))
        run_verifier(original_path, should_pass=True, label='unmodified real transaction record')
        run_verifier(original_path, expected_chain='1', should_pass=False, label='wrong expected chain ID')

        mutations = {}
        changed = copy.deepcopy(original); changed['policyVersion'] = str(int(changed['policyVersion']) + 1); mutations['policy version'] = changed
        changed = copy.deepcopy(original); changed['policyHash'] = '0x' + '00' * 32; mutations['policy hash'] = changed
        changed = copy.deepcopy(original); changed['transfer']['amountRaw'] = str(int(changed['transfer']['amountRaw']) + 1); mutations['amount'] = changed
        changed = copy.deepcopy(original); changed['transfer']['from'] = '0x' + '33' * 20; mutations['sender'] = changed
        changed = copy.deepcopy(original); changed['transfer']['to'] = '0x' + '44' * 20; mutations['recipient'] = changed
        changed = copy.deepcopy(original); changed.pop('events'); mutations['missing event summaries'] = changed
        changed = copy.deepcopy(original); changed['events'].pop('managerTransferChecked'); mutations['missing manager event'] = changed
        changed = copy.deepcopy(original); changed['events'].pop('erc20Transfer'); mutations['missing token event'] = changed
        changed = copy.deepcopy(original); changed['events']['managerTransferChecked']['transactionHash'] = '0x' + '55' * 32; mutations['different manager event transaction'] = changed
        changed = copy.deepcopy(original); changed['events']['erc20Transfer']['transactionHash'] = '0x' + '66' * 32; mutations['different token event transaction'] = changed
        changed = copy.deepcopy(original); changed['sameTransaction'] = False; mutations['same-transaction flag'] = changed
        changed = copy.deepcopy(original); changed['policyUpdates'] = changed['policyUpdates'][1:]; mutations['policy history gap'] = changed
        changed = copy.deepcopy(original); changed['policyUpdates'] = list(reversed(changed['policyUpdates'])); mutations['policy history ordering'] = changed
        changed = copy.deepcopy(original); changed['transactionHash'] = '0x' + '77' * 32; mutations['unrelated transaction'] = changed
        changed = copy.deepcopy(original); changed['blockHash'] = '0x' + '88' * 32; mutations['block hash'] = changed
        changed = copy.deepcopy(original); changed['transactionSender'] = '0x' + '99' * 20; mutations['transaction sender'] = changed
        for name, mutated in mutations.items():
            path = Path(directory) / (name.replace(' ', '-') + '.json')
            path.write_text(json.dumps(mutated))
            run_verifier(path, should_pass=False, label=f'mutated {name}')
            print(f'PASS rejected mutated audit record: {name}')

        # Also verify that the checker remains effective when Python assertions are disabled.
        command = verifier_command(original_path)
        optimized = subprocess.run([sys.executable, '-O', *command[1:]], text=True, capture_output=True)
        if optimized.returncode != 0:
            raise RuntimeError(f'optimized valid-record verification failed:\n{optimized.stdout}\n{optimized.stderr}')
        print('PASS valid record still verifies under python -O (checks do not depend on assert)')

    for mode in ('missing_manager_event', 'missing_token_event', 'cross_transaction_events', 'bad_receipt_block_hash', 'policy_history_gap'):
        run_with_proxy(mode)
        print(f'PASS rejected RPC proof mutation: {mode}')
    print(f'ALL AUDIT VERIFIER NEGATIVE TESTS PASSED against real Anvil transaction {RECORD["transactionHash"]}')

if __name__ == '__main__':
    main()
