#!/usr/bin/env python3
"""REFERENCE IMPLEMENTATION CHECK, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION."""
from pathlib import Path
import yaml
from openapi_spec_validator import validate_spec

path=Path(__file__).resolve().parents[1]/'api'/'openapi.yaml'
spec=yaml.safe_load(path.read_text())
validate_spec(spec)
assert spec.get('openapi')=='3.0.3'
assert {'/v1/verify','/v1/policy','/health'} <= set(spec['paths'])
print(f'PASS OpenAPI 3.0.3 validation: {path}')
