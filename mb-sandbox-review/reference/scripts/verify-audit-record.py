#!/usr/bin/env python3
"""REFERENCE VERIFIER, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION."""
import argparse
import datetime as dt
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from Crypto.Hash import keccak

ADDRESS_RE = re.compile(r'^0x[0-9a-fA-F]{40}$')
HASH_RE = re.compile(r'^0x[0-9a-fA-F]{64}$')
ZERO_HASH = bytes(32)
TRANSFER_SIGNATURE = 'transferSukuk(bytes32,address,address,uint256)'
SIG_POLICY = 'PolicyUpdated(uint256,bytes32)'
SIG_ASSET = 'AssetComplianceUpdated(address,bool)'
SIG_EXECUTOR = 'ExecutorStatusUpdated(address,bool)'
SIG_ROUTER = 'RouterAuthorizationUpdated(address,bool)'
SIG_MANAGER = 'TransferChecked(bytes32,address,address,address,uint256,uint256,bytes32)'
SIG_TRANSFER = 'Transfer(address,address,uint256)'
VALIDATION_TEXT = 'receipt, calldata, ERC20 Transfer, TransferChecked, block binding, pinned registry state and ordered PolicyUpdated hash chain verified by verify-audit-record.py'

class VerificationError(Exception):
    """Input, RPC or evidence failed an explicit validation check."""

def require(condition, message):
    if not condition:
        raise VerificationError(message)

def k256(data: bytes) -> bytes:
    h = keccak.new(digest_bits=256)
    h.update(data)
    return h.digest()

def topic(signature: str) -> str:
    return '0x' + k256(signature.encode()).hex()

def rpc(url: str, method: str, params: list):
    body = json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': method, 'params': params}).encode()
    request = urllib.request.Request(url, body, {'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = json.load(response)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise VerificationError(f'RPC {method} failed: {error}') from error
    require(isinstance(payload, dict), f'RPC {method} returned a non-object response')
    require('error' not in payload, f'RPC {method} error: {payload.get("error")}')
    require('result' in payload, f'RPC {method} omitted result')
    return payload['result']

def hex_bytes(value, name, length=None):
    require(isinstance(value, str) and value.startswith('0x'), f'{name} must be 0x-prefixed hex')
    raw = value[2:]
    require(len(raw) % 2 == 0 and re.fullmatch(r'[0-9a-fA-F]*', raw) is not None, f'{name} is malformed hex')
    result = bytes.fromhex(raw)
    if length is not None:
        require(len(result) == length, f'{name} must be {length} bytes')
    return result

def address(value, name):
    require(isinstance(value, str) and ADDRESS_RE.fullmatch(value) is not None, f'{name} must be a 20-byte address')
    return value.lower()

def hash32(value, name):
    require(isinstance(value, str) and HASH_RE.fullmatch(value) is not None, f'{name} must be a 32-byte hash')
    return value.lower()

def quantity(value, name):
    require(isinstance(value, str) and re.fullmatch(r'0x[0-9a-fA-F]+', value) is not None, f'{name} is not a hex quantity')
    return int(value, 16)

def word_bytes(data, index, name):
    require(len(data) >= (index + 1) * 32, f'{name} is truncated at word {index}')
    return data[index * 32:(index + 1) * 32]

def address_from_word(value, name):
    require(len(value) == 32 and value[:12] == bytes(12), f'{name} has a non-canonical ABI address')
    return '0x' + value[-20:].hex()

def transaction_position(log, name='log'):
    return (
        quantity(log.get('blockNumber'), f'{name}.blockNumber'),
        quantity(log.get('transactionIndex'), f'{name}.transactionIndex'),
        quantity(log.get('logIndex'), f'{name}.logIndex'),
    )

def event_log_common(log, expected_tx, block_number, block_hash, tx_index, name):
    require(isinstance(log, dict), f'{name} is not an object')
    require(hash32(log.get('transactionHash'), f'{name}.transactionHash') == expected_tx, f'{name} transaction hash mismatch')
    require(quantity(log.get('blockNumber'), f'{name}.blockNumber') == block_number, f'{name} block number mismatch')
    require(hash32(log.get('blockHash'), f'{name}.blockHash') == block_hash, f'{name} block hash mismatch')
    require(quantity(log.get('transactionIndex'), f'{name}.transactionIndex') == tx_index, f'{name} transaction index mismatch')

def decode_tx_input(tx, manager, request_id_expected=None, from_expected=None, to_expected=None, amount_expected=None):
    require(isinstance(tx, dict), 'transaction not found')
    require(hash32(tx.get('hash'), 'transaction.hash') is not None, 'transaction hash invalid')
    require(address(tx.get('to'), 'transaction.to') == manager, 'transaction destination is not the configured manager')
    require(address(tx.get('from'), 'transaction.from'), 'transaction sender is invalid')
    raw = hex_bytes(tx.get('input'), 'transaction.input')
    expected_selector = k256(TRANSFER_SIGNATURE.encode())[:4]
    require(raw[:4] == expected_selector, 'transaction calldata is not transferSukuk(bytes32,address,address,uint256)')
    require(len(raw) == 4 + 4 * 32, 'transferSukuk calldata has an unexpected length')
    request_id = word_bytes(raw[4:], 0, 'transaction.input')
    from_address = address_from_word(word_bytes(raw[4:], 1, 'transaction.input'), 'calldata from')
    to_address = address_from_word(word_bytes(raw[4:], 2, 'transaction.input'), 'calldata to')
    amount = int.from_bytes(word_bytes(raw[4:], 3, 'transaction.input'), 'big')
    if request_id_expected is not None:
        require('0x' + request_id.hex() == hash32(request_id_expected, 'expected request ID'), 'calldata request ID mismatch')
    if from_expected is not None:
        require(from_address == address(from_expected, 'expected from address'), 'calldata sender mismatch')
    if to_expected is not None:
        require(to_address == address(to_expected, 'expected to address'), 'calldata recipient mismatch')
    if amount_expected is not None:
        require(amount == int(amount_expected), 'calldata amount mismatch')
    return {
        'requestId': '0x' + request_id.hex(),
        'from': from_address,
        'to': to_address,
        'amount': amount,
        'transactionSender': address(tx['from'], 'transaction.from'),
    }

def replay_history(logs, registry, before_position=None):
    policy_topic = topic(SIG_POLICY)
    setting_topics = {
        topic(SIG_ASSET): 'asset',
        topic(SIG_EXECUTOR): 'executor',
        topic(SIG_ROUTER): 'router',
    }
    ordered = sorted(logs, key=lambda item: transaction_position(item, 'registry log'))
    current = 0
    previous = ZERO_HASH
    pending = {}
    updates = []
    for log in ordered:
        position = transaction_position(log, 'registry log')
        if before_position is not None and position >= before_position:
            break
        require(address(log.get('address'), 'registry log address') == registry, 'policy log came from a different registry')
        topics = log.get('topics')
        require(isinstance(topics, list) and topics, 'registry log has no topics')
        event_topic = hash32(topics[0], 'registry log topic').lower()
        tx_hash = hash32(log.get('transactionHash'), 'registry log transaction hash')
        if event_topic == policy_topic:
            require(len(topics) == 2, 'PolicyUpdated has unexpected topics')
            require(tx_hash not in pending, 'PolicyUpdated event was not paired before another policy event')
            version = int.from_bytes(hex_bytes(topics[1], 'PolicyUpdated version', 32), 'big')
            data = hex_bytes(log.get('data'), 'PolicyUpdated data', 32)
            pending[tx_hash] = {'version': version, 'hash': data}
        elif event_topic in setting_topics:
            require(len(topics) == 2, 'registry setting event has unexpected topics')
            require(tx_hash in pending, 'registry setting event has no preceding PolicyUpdated event')
            change = pending.pop(tx_hash)
            field = setting_topics[event_topic]
            subject = address_from_word(hex_bytes(topics[1], f'{field} subject', 32), f'{field} subject')
            status_word = int.from_bytes(hex_bytes(log.get('data'), f'{field} status', 32), 'big')
            require(status_word in (0, 1), f'{field} status is not a bool')
            require(change['version'] == current + 1, f'policy version sequence gap at {change["version"]}')
            field_hash = k256(field.encode())
            recomputed = k256(previous + field_hash + bytes.fromhex(subject[2:]).rjust(32, b'\0') + status_word.to_bytes(32, 'big'))
            require(recomputed == change['hash'], f'policy hash mismatch at version {change["version"]}')
            current = change['version']
            previous = recomputed
            updates.append({
                'version': str(current), 'field': field, 'subject': subject,
                'status': bool(status_word), 'policyHash': '0x' + recomputed.hex(),
            })
    require(not pending, 'unpaired PolicyUpdated event in replay range')
    return current, previous, updates

def derive_record(rpc_url, tx_hash, registry, manager, token, expected_chain_id, confirmations,
                  request_id_expected=None, from_expected=None, to_expected=None, amount_expected=None):
    registry = address(registry, 'registry')
    manager = address(manager, 'manager')
    token = address(token, 'token')
    tx_hash = hash32(tx_hash, 'transaction hash')
    expected_chain_id = int(expected_chain_id)
    require(expected_chain_id > 0, 'expected chain ID must be positive')
    require(isinstance(confirmations, int) and confirmations >= 1, 'confirmations must be at least one')

    chain_id = quantity(rpc(rpc_url, 'eth_chainId', []), 'chain ID')
    require(chain_id == expected_chain_id, f'connected chain ID {chain_id} differs from expected {expected_chain_id}')
    tx = rpc(rpc_url, 'eth_getTransactionByHash', [tx_hash])
    decoded = decode_tx_input(tx, manager, request_id_expected, from_expected, to_expected, amount_expected)
    require(hash32(tx['hash'], 'transaction hash') == tx_hash, 'transaction lookup returned a different hash')
    require(decoded['transactionSender'] == decoded['from'], 'transaction signer is not the token owner initiating the manager transfer')
    require(decoded['requestId'] != '0x' + bytes(32).hex(), 'zero request ID is not a valid manager transfer')
    require(decoded['to'] != '0x' + bytes(20).hex(), 'zero recipient is not a valid manager transfer')

    receipt = rpc(rpc_url, 'eth_getTransactionReceipt', [tx_hash])
    require(isinstance(receipt, dict), 'transaction receipt not found')
    require(hash32(receipt.get('transactionHash'), 'receipt transaction hash') == tx_hash, 'receipt transaction hash mismatch')
    require(quantity(receipt.get('status'), 'receipt status') == 1, 'manager transfer transaction failed')
    block_number = quantity(receipt.get('blockNumber'), 'receipt block number')
    tx_index = quantity(receipt.get('transactionIndex'), 'receipt transaction index')
    block_hash = hash32(receipt.get('blockHash'), 'receipt block hash')
    block = rpc(rpc_url, 'eth_getBlockByNumber', [hex(block_number), False])
    require(isinstance(block, dict), 'receipt block not found')
    require(quantity(block.get('number'), 'block number') == block_number, 'block number differs from receipt')
    require(hash32(block.get('hash'), 'block hash') == block_hash, 'receipt block hash differs from canonical block header')
    head_number = quantity(rpc(rpc_url, 'eth_blockNumber', []), 'head block number')
    actual_confirmations = head_number - block_number + 1
    require(actual_confirmations >= confirmations, f'insufficient confirmations: {actual_confirmations} < {confirmations}')
    timestamp = quantity(block.get('timestamp'), 'block timestamp')
    iso = dt.datetime.fromtimestamp(timestamp, dt.timezone.utc).isoformat().replace('+00:00', 'Z')

    receipt_logs = receipt.get('logs')
    require(isinstance(receipt_logs, list), 'receipt logs are missing')
    manager_topic = topic(SIG_MANAGER)
    transfer_topic = topic(SIG_TRANSFER)
    manager_logs = []
    token_logs = []
    for log in receipt_logs:
        require(isinstance(log, dict), 'receipt contains a malformed log')
        log_address = address(log.get('address'), 'receipt log address')
        topics = log.get('topics')
        require(isinstance(topics, list) and topics, 'receipt log has no topics')
        first_topic = hash32(topics[0], 'receipt log topic')
        if log_address == manager and first_topic == manager_topic:
            manager_logs.append(log)
        if log_address == token and first_topic == transfer_topic:
            token_logs.append(log)
    require(len(manager_logs) == 1, f'expected exactly one TransferChecked event, got {len(manager_logs)}')
    require(len(token_logs) == 1, f'expected exactly one ERC20 Transfer event, got {len(token_logs)}')
    manager_log = manager_logs[0]
    transfer_log = token_logs[0]
    event_log_common(manager_log, tx_hash, block_number, block_hash, tx_index, 'TransferChecked')
    event_log_common(transfer_log, tx_hash, block_number, block_hash, tx_index, 'ERC20 Transfer')
    manager_topics = manager_log.get('topics')
    transfer_topics = transfer_log.get('topics')
    require(len(manager_topics) == 3, 'TransferChecked has unexpected topics')
    require(len(transfer_topics) == 3, 'ERC20 Transfer has unexpected topics')
    require(hash32(manager_topics[1], 'TransferChecked requestId') == decoded['requestId'], 'TransferChecked request ID mismatch')
    require(address_from_word(hex_bytes(manager_topics[2], 'TransferChecked token', 32), 'TransferChecked token') == token, 'TransferChecked token mismatch')
    manager_data = hex_bytes(manager_log.get('data'), 'TransferChecked data', 5 * 32)
    manager_from = address_from_word(word_bytes(manager_data, 0, 'TransferChecked'), 'TransferChecked from')
    manager_to = address_from_word(word_bytes(manager_data, 1, 'TransferChecked'), 'TransferChecked to')
    manager_amount = int.from_bytes(word_bytes(manager_data, 2, 'TransferChecked'), 'big')
    policy_version = int.from_bytes(word_bytes(manager_data, 3, 'TransferChecked'), 'big')
    policy_hash = word_bytes(manager_data, 4, 'TransferChecked')
    require((manager_from, manager_to, manager_amount) == (decoded['from'], decoded['to'], decoded['amount']), 'manager event transfer fields differ from calldata')
    require(transfer_topics[1].lower() == '0x' + bytes.fromhex(manager_from[2:]).rjust(32, b'\0').hex(), 'ERC20 Transfer from mismatch')
    require(transfer_topics[2].lower() == '0x' + bytes.fromhex(manager_to[2:]).rjust(32, b'\0').hex(), 'ERC20 Transfer to mismatch')
    transfer_data = hex_bytes(transfer_log.get('data'), 'ERC20 Transfer data', 32)
    require(int.from_bytes(transfer_data, 'big') == manager_amount, 'ERC20 Transfer amount mismatch')
    manager_position = transaction_position(manager_log, 'TransferChecked')
    transfer_position = transaction_position(transfer_log, 'ERC20 Transfer')
    require(transfer_position < manager_position, 'ERC20 Transfer must precede TransferChecked in the receipt')

    all_logs = rpc(rpc_url, 'eth_getLogs', [{
        'address': registry, 'fromBlock': '0x0', 'toBlock': hex(block_number),
    }])
    require(isinstance(all_logs, list), 'registry history query did not return a log array')
    version_at_transfer, hash_at_transfer, updates_at_transfer = replay_history(all_logs, registry, manager_position)
    require(version_at_transfer == policy_version, 'registry event replay version at transfer differs from TransferChecked')
    require(hash_at_transfer == policy_hash, 'registry event replay hash at transfer differs from TransferChecked')
    final_version, final_hash, _ = replay_history(all_logs, registry)
    block_tag = hex(block_number)
    get_version = hex_bytes(rpc(rpc_url, 'eth_call', [{'to': registry, 'data': '0x5e7770c8'}, block_tag]), 'registry getPolicyVersion', 32)
    get_hash = hex_bytes(rpc(rpc_url, 'eth_call', [{'to': registry, 'data': '0x505119f3' + policy_version.to_bytes(32, 'big').hex()}, block_tag]), 'registry policyHistory', 32)
    final_hash_data = hex_bytes(rpc(rpc_url, 'eth_call', [{'to': registry, 'data': '0x505119f3' + final_version.to_bytes(32, 'big').hex()}, block_tag]), 'registry final policyHistory', 32)
    require(int.from_bytes(get_version, 'big') == final_version, 'registry getter version at receipt block differs from full event replay')
    require(final_hash_data == final_hash, 'registry getter hash at receipt block differs from full event replay')
    require(get_hash == policy_hash, 'registry historical hash at receipt block differs from TransferChecked')
    require(int.from_bytes(get_version, 'big') >= policy_version, 'registry version at receipt block predates transfer policy version')
    require(len(updates_at_transfer) == policy_version, 'policy history update count differs from transfer version')

    return {
        'recordType': 'local Anvil reference transfer; not production evidence',
        'chainId': str(chain_id),
        'registry': registry,
        'manager': manager,
        'token': token,
        'transactionHash': tx_hash,
        'transactionSender': decoded['transactionSender'],
        'transactionTarget': manager,
        'blockNumber': str(block_number),
        'blockHash': block_hash,
        'confirmationsRequired': str(confirmations),
        'confirmationsObserved': str(actual_confirmations),
        'timestamp': iso,
        'requestId': decoded['requestId'],
        'transfer': {'from': decoded['from'], 'to': decoded['to'], 'amountRaw': str(decoded['amount']), 'decimals': 18},
        'policyVersion': str(policy_version),
        'policyHash': '0x' + policy_hash.hex(),
        'sameTransaction': True,
        'events': {
            'erc20Transfer': {'transactionHash': tx_hash, 'blockHash': block_hash, 'transactionIndex': str(tx_index), 'logIndex': str(quantity(transfer_log.get('logIndex'), 'Transfer logIndex'))},
            'managerTransferChecked': {'transactionHash': tx_hash, 'blockHash': block_hash, 'transactionIndex': str(tx_index), 'logIndex': str(quantity(manager_log.get('logIndex'), 'TransferChecked logIndex'))},
        },
        'policyUpdates': updates_at_transfer,
        'finalPolicyAtReceiptBlock': {'version': str(final_version), 'hash': '0x' + final_hash.hex()},
        'validation': VALIDATION_TEXT,
    }

def compare_record(provided, reconstructed):
    require(isinstance(provided, dict), 'audit record must be a JSON object')
    if provided != reconstructed:
        keys = sorted(set(provided) | set(reconstructed))
        changed = [key for key in keys if provided.get(key) != reconstructed.get(key)]
        raise VerificationError('audit record differs from transaction and registry evidence in: ' + ', '.join(changed))

def positive_int(value):
    try:
        result = int(value)
    except (TypeError, ValueError) as error:
        raise argparse.ArgumentTypeError('must be an integer') from error
    if result < 1:
        raise argparse.ArgumentTypeError('must be at least one')
    return result

def main():
    parser = argparse.ArgumentParser(description='Verify a local reference transfer record against the configured chain and deployed contracts.')
    parser.add_argument('--rpc-url', required=True)
    parser.add_argument('--expected-chain-id', type=positive_int, required=True)
    parser.add_argument('--confirmations', type=positive_int, default=1)
    parser.add_argument('--registry', required=True)
    parser.add_argument('--manager', required=True)
    parser.add_argument('--token', required=True)
    parser.add_argument('--record', help='Re-fetch and compare an existing JSON audit record')
    parser.add_argument('--tx-hash')
    parser.add_argument('--from-address')
    parser.add_argument('--to-address')
    parser.add_argument('--request-id')
    parser.add_argument('--amount')
    parser.add_argument('--output')
    args = parser.parse_args()

    try:
        if args.record:
            require(not any([args.tx_hash, args.from_address, args.to_address, args.request_id, args.amount, args.output]), 'use either --record or generation arguments, not both')
            try:
                provided = json.loads(Path(args.record).read_text())
            except (OSError, json.JSONDecodeError) as error:
                raise VerificationError(f'cannot read audit record: {error}') from error
            require(isinstance(provided, dict) and 'transactionHash' in provided, 'record has no transactionHash')
            reconstructed = derive_record(args.rpc_url, provided['transactionHash'], args.registry, args.manager, args.token, args.expected_chain_id, args.confirmations)
            compare_record(provided, reconstructed)
            print(f'PASS serialized audit record matches chain evidence: {reconstructed["transactionHash"]}')
            print(f'PASS expected chain {args.expected_chain_id}; block {reconstructed["blockNumber"]}; policy version {reconstructed["policyVersion"]}')
            return

        missing = [name for name in ('tx_hash', 'from_address', 'to_address', 'request_id', 'amount', 'output') if getattr(args, name) is None]
        require(not missing, 'generation mode requires: ' + ', '.join('--' + name.replace('_', '-') for name in missing))
        reconstructed = derive_record(
            args.rpc_url, args.tx_hash, args.registry, args.manager, args.token,
            args.expected_chain_id, args.confirmations,
            request_id_expected=args.request_id, from_expected=args.from_address,
            to_expected=args.to_address, amount_expected=args.amount,
        )
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(reconstructed, indent=2) + '\n')
        print(f'PASS receipt, calldata, events and block binding: {reconstructed["transactionHash"]}')
        print(f'PASS policy hash chain at transfer event: version {reconstructed["policyVersion"]}, {reconstructed["policyHash"]}')
        print(f'PASS registry history at block end: version {reconstructed["finalPolicyAtReceiptBlock"]["version"]}; confirmations {reconstructed["confirmationsObserved"]}')
        print(f'WROTE {output}')
    except (VerificationError, OSError, ValueError, KeyError, TypeError, OverflowError) as error:
        print(f'FAIL audit verification: {error}', file=sys.stderr)
        raise SystemExit(1)

if __name__ == '__main__':
    main()
