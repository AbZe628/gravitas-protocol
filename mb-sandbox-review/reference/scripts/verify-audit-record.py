#!/usr/bin/env python3
"""REFERENCE VERIFIER, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION."""
import argparse
import datetime as dt
import json
import subprocess
import urllib.request
from pathlib import Path
from Crypto.Hash import keccak

SIG_POLICY = 'PolicyUpdated(uint256,bytes32)'
SIG_ASSET = 'AssetComplianceUpdated(address,bool)'
SIG_EXECUTOR = 'ExecutorStatusUpdated(address,bool)'
SIG_ROUTER = 'RouterAuthorizationUpdated(address,bool)'
SIG_MANAGER = 'TransferChecked(bytes32,address,address,address,uint256,uint256,bytes32)'
SIG_TRANSFER = 'Transfer(address,address,uint256)'

def k256(data: bytes) -> bytes:
    h = keccak.new(digest_bits=256); h.update(data); return h.digest()

def topic(signature: str) -> str:
    return '0x' + k256(signature.encode()).hex()

def rpc(url: str, method: str, params: list):
    body=json.dumps({'jsonrpc':'2.0','id':1,'method':method,'params':params}).encode()
    req=urllib.request.Request(url,body,{'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=5) as response: value=json.load(response)
    if 'error' in value: raise RuntimeError(f"RPC {method}: {value['error']}")
    return value['result']

def word(data: str, index: int) -> bytes:
    b=bytes.fromhex(data.removeprefix('0x'))
    return b[index*32:(index+1)*32]

def address_word(value: str) -> bytes:
    return bytes.fromhex(value.removeprefix('0x')).rjust(32,b'\0')

def hash_change(previous: bytes, field: str, subject: str, status: bool) -> bytes:
    field_hash=k256(field.encode())
    encoded=previous+field_hash+address_word(subject)+(int(status).to_bytes(32,'big'))
    return k256(encoded)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--rpc-url',required=True)
    ap.add_argument('--tx-hash',required=True)
    ap.add_argument('--registry',required=True)
    ap.add_argument('--manager',required=True)
    ap.add_argument('--token',required=True)
    ap.add_argument('--from-address',required=True)
    ap.add_argument('--to-address',required=True)
    ap.add_argument('--request-id',required=True)
    ap.add_argument('--amount',required=True)
    ap.add_argument('--output',required=True)
    args=ap.parse_args()
    registry=args.registry.lower(); manager=args.manager.lower(); token=args.token.lower()
    tx_hash=args.tx_hash.lower(); request_id=args.request_id.lower()
    receipt=rpc(args.rpc_url,'eth_getTransactionReceipt',[tx_hash])
    assert receipt is not None, 'transaction receipt not found'
    assert receipt['status']=='0x1', 'manager transfer transaction failed'
    assert receipt['transactionHash'].lower()==tx_hash
    block_no=int(receipt['blockNumber'],16); block_hex=hex(block_no)
    block=rpc(args.rpc_url,'eth_getBlockByNumber',[block_hex,False])
    timestamp=int(block['timestamp'],16)
    chain_id=int(rpc(args.rpc_url,'eth_chainId',[]),16)
    logs=receipt['logs']
    t_manager=topic(SIG_MANAGER); t_transfer=topic(SIG_TRANSFER)
    manager_logs=[x for x in logs if x['address'].lower()==manager and x['topics'][0].lower()==t_manager]
    transfer_logs=[x for x in logs if x['address'].lower()==token and x['topics'][0].lower()==t_transfer]
    assert len(manager_logs)==1, f'expected one TransferChecked event, got {len(manager_logs)}'
    assert len(transfer_logs)==1, f'expected one ERC20 Transfer event, got {len(transfer_logs)}'
    ml=manager_logs[0]; tl=transfer_logs[0]
    assert ml['topics'][1].lower()==request_id, 'requestId topic mismatch'
    assert ml['topics'][2].lower()=='0x'+address_word(token).hex(), 'manager token topic mismatch'
    from_event='0x'+word(ml['data'],0)[-20:].hex()
    to_event='0x'+word(ml['data'],1)[-20:].hex()
    amount=int.from_bytes(word(ml['data'],2),'big')
    version=int.from_bytes(word(ml['data'],3),'big')
    policy_hash=word(ml['data'],4)
    assert from_event==args.from_address.lower(), 'manager from address mismatch'
    assert to_event==args.to_address.lower(), 'manager to address mismatch'
    assert amount==int(args.amount), 'manager amount mismatch'
    assert tl['topics'][1].lower()=='0x'+address_word(from_event).hex(), 'ERC20 Transfer from mismatch'
    assert tl['topics'][2].lower()=='0x'+address_word(to_event).hex(), 'ERC20 Transfer to mismatch'
    assert int.from_bytes(word(tl['data'],0),'big')==amount, 'ERC20 Transfer amount mismatch'
    assert int(ml['blockNumber'],16)==block_no==int(tl['blockNumber'],16), 'events are not in the same block'
    assert ml['transactionHash'].lower()==tl['transactionHash'].lower()==tx_hash, 'events are not in the same transaction'

    t_policy=topic(SIG_POLICY); t_asset=topic(SIG_ASSET); t_executor=topic(SIG_EXECUTOR); t_router=topic(SIG_ROUTER)
    all_logs=rpc(args.rpc_url,'eth_getLogs',[{'address':registry,'fromBlock':'0x0','toBlock':block_hex}])
    all_logs.sort(key=lambda x:(int(x['blockNumber'],16),int(x['transactionIndex'],16),int(x['logIndex'],16)))
    previous=bytes(32); current=0; pending={}; updates=[]
    for log in all_logs:
        tx=log['transactionHash'].lower(); top=log['topics'][0].lower()
        if top==t_policy:
            assert tx not in pending, 'two unpaired policy events in one transaction'
            pending[tx]={'version':int(log['topics'][1],16),'hash':bytes.fromhex(log['data'][2:])}
        elif top in (t_asset,t_executor,t_router):
            assert tx in pending, 'registry setting event has no PolicyUpdated event'
            change=pending.pop(tx)
            if top==t_asset:
                field='asset'; subject='0x'+log['topics'][1][-40:].lower()
            elif top==t_executor:
                field='executor'; subject='0x'+log['topics'][1][-40:].lower()
            else:
                field='router'; subject='0x'+log['topics'][1][-40:].lower()
            status=int.from_bytes(word(log['data'],0),'big')==1
            assert change['version']==current+1, 'policy version sequence has a gap'
            recomputed=hash_change(previous,field,subject,status)
            assert recomputed==change['hash'], f'policy hash mismatch at version {change["version"]}'
            current=change['version']; previous=recomputed
            updates.append({'version':str(current),'field':field,'subject':subject,'status':status,'policyHash':'0x'+recomputed.hex()})
    assert not pending, 'unpaired PolicyUpdated event'
    assert current==version, f'event replay version {current} differs from manager version {version}'
    block_tag=hex(block_no)
    get_version=rpc(args.rpc_url,'eth_call',[{'to':registry,'data':'0x5e7770c8'},block_tag])
    get_hash=rpc(args.rpc_url,'eth_call',[{'to':registry,'data':'0x505119f3'+version.to_bytes(32,'big').hex()},block_tag])
    assert int(get_version,16)==version, 'registry version at receipt block differs'
    assert bytes.fromhex(get_hash[2:])==policy_hash==previous, 'registry hash at receipt block differs from event and replay'
    iso=dt.datetime.fromtimestamp(timestamp,dt.timezone.utc).isoformat().replace('+00:00','Z')
    record={
        'recordType':'local Anvil reference transfer; not production evidence',
        'chainId':str(chain_id),'registry':registry,'manager':manager,'token':token,
        'transactionHash':tx_hash,'blockNumber':str(block_no),'timestamp':iso,
        'requestId':request_id,
        'transfer':{'from':from_event,'to':to_event,'amountRaw':str(amount),'decimals':18},
        'policyVersion':str(version),'policyHash':'0x'+policy_hash.hex(),
        'sameTransaction':True,
        'policyUpdates':updates,
        'validation':'receipt, ERC20 Transfer, TransferChecked, pinned registry getters and ordered PolicyUpdated hash chain verified by verify-audit-record.py'
    }
    path=Path(args.output); path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(record,indent=2)+'\n')
    print(f'PASS receipt/events same transaction: {tx_hash}')
    print(f'PASS policy hash chain through version {version}: 0x{policy_hash.hex()}')
    print(f'PASS block {block_no}, chain {chain_id}, timestamp {iso}')
    print(f'WROTE {path}')

if __name__=='__main__': main()
