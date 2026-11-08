"""Compare calculator fixtures with fresh source-only extraction in scratch space."""
import hashlib
import json
import runpy
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[2]
extractor = root / 'tools/evidence/calculators-reference.py'
model = runpy.run_path(str(extractor))
generate = model['generate']
output = Path(sys.argv[1]).resolve()
generate.__globals__['OUT'] = output
hashes = {}
for route in model['ROUTES']:
    generate(route)
    name = f'{route}.json'
    extracted = (output / name).read_bytes()
    if extracted != (root / 'tests/reference/calculators' / name).read_bytes():
        raise SystemExit(f'Independent extraction disagrees with {name}')
    hashes[route] = hashlib.sha256(extracted).hexdigest()
print(json.dumps(hashes))
