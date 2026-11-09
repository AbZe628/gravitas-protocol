#!/usr/bin/env python3
"""REFERENCE IMPLEMENTATION CHECK, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION."""
import json, os, urllib.error, urllib.request
from pathlib import Path

root=Path(__file__).resolve().parents[3]
deployment=json.loads((root/'mb-sandbox-review/reference/deployments/local.json').read_text())
base=os.getenv('API_URL','http://127.0.0.1:8787').rstrip('/')
key=os.environ['MB_API_KEY']
def request(path, method='GET', payload=None, api_key=key):
    headers={'X-API-Key':api_key}
    data=None
    if payload is not None:
        headers['Content-Type']='application/json'; data=json.dumps(payload).encode()
    req=urllib.request.Request(base+path,data=data,headers=headers,method=method)
    try:
        with urllib.request.urlopen(req,timeout=8) as response: return response.status,json.load(response)
    except urllib.error.HTTPError as e: return e.code,json.load(e)
status,health=request('/health'); assert status==200 and health['status']=='ok'
status,policy=request('/v1/policy'); assert status==200 and policy['policyVersion']=='3' and policy['paused'] is False
body={'asset':deployment['gatedToken'],'amount':'1.00','context':{'channel':'local-anvil','requestId':'live-allowed'}}
status,allowed=request('/v1/verify','POST',body); assert status==200 and allowed['decision']=='ALLOW' and allowed['policyVersion']=='3'
body['asset']='0x2222222222222222222222222222222222222222'; body['context']['requestId']='live-refused'
status,refused=request('/v1/verify','POST',body); assert status==200 and refused['decision']=='DENY' and refused['reasonCode']=='ASSET_NOT_APPROVED'
status,unauthorized=request('/health',api_key='incorrect-key'); assert status==401
print('PASS authenticated /health')
print('PASS /v1/policy at version 3')
print('PASS gated token live decision ALLOW')
print('PASS unapproved address live decision DENY')
print('PASS incorrect key rejected with 401')
print(f"Registry {deployment['registry']}; gated token {deployment['gatedToken']}; manager {deployment['manager']}")
