"""Pin reused source/REA anchors and verify originals; does not execute vendor code."""
from pathlib import Path
import hashlib, json, re

product = Path(__file__).resolve().parents[2]
source = product.parent
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
artifact_hash = '55a55522875ad7131d1367a08667ae653416c9be2decbd3bd5c54a9b8c04d03c'
assert digest(source / 'Pipedata-Pro 14.1.exe') == artifact_hash
source_file = source / 'audit/executable/Pipedata_Pro_14_1.Module1.cs'
source_hash = 'ae2389a910a610523c4e012acf3e65be4f7458c7ca9fdbb0d83d5e2c63d13c6a'
assert digest(source_file) == source_hash
methods = json.loads((source / 'audit/executable/methods.json').read_text())
anchors = {'ImperialiseWereNecessary': 28033, 'FormatDim': 39366, 'FormatDim_Zero_Dec_Places': 39381, 'DoDrawing': 40913, 'FractionizeIfNeccessary': 58370, 'Find': 56155}
lines = source_file.read_text().splitlines()
refs = []
for name, line in anchors.items():
    assert name in lines[line-1], (name, line)
    m = next(m for m in methods if m['type'] == 'Pipedata_Pro_14_1.Module1' and m['name'] == name)
    token = 0x06000000 | int(re.search(r'0x([0-9a-f]+)', m['token'])[1], 16)
    refs.append({'method': name, 'sourceRef': {'path': 'audit/executable/Pipedata_Pro_14_1.Module1.cs', 'hash': source_hash, 'line': line, 'token': f'0x{token:08x}', 'rva': m['rva']}, 'ilSha256': m['il_sha256'], 'level': 'observed-static'})
inventory = json.loads((source / 'audit/data/inventory.json').read_text())
for item in inventory:
    assert digest(source / 'Database' / item['path']) == item['sha256'], item['path']
framework = json.loads((product / 'tests/reference/vb.json').read_text())
assert framework['helperSha256'] == digest(product / 'tools/evidence/framework-fixtures.ps1')
evidence = {
    'schemaVersion': 1, 'scope': 'Task3 infrastructure only; later functional route cards remain pending',
    'artifact': {'sha256': artifact_hash, 'mvid': '948a0d3b-1670-4555-9843-5e7ed73785db'},
    'methods': refs,
    'reaReuse': {'path': 'evidence/catalog-load-evidence.json', 'hash': digest(product / 'evidence/catalog-load-evidence.json'), 'scope': 'Prior same-artifact all1481 raw-IL-body hash crosscheck, not runtime semantics'},
    'displayInstructionAnchors': {'path': 'audit/recheck-2026-11-01/display-il-evidence.json', 'hash': digest(source / 'audit/recheck-2026-11-01/display-il-evidence.json'), 'scope': 'FormatDim Math.Round/Val/ToString and DoDrawing call ordering'},
    'culture': {k: framework[k] for k in ['culture','runtime','coreLibrary','vbAssembly','sortVersion','helperSha256']},
    'fixtures': {'path': 'tests/reference/vb.json', 'hash': digest(product / 'tests/reference/vb.json'), 'cases': len(framework['cases'])},
    'stateSchema': {'codecVersion': 1, 'stateSchemaVersion': 1, 'bounds': {'activeDba': [6,1001,1001], 'lineMem': [10001,11]}, 'nullCellEvidenceLines': [962,990], 'undefined': 'not admitted by current state schema; CLR string cells initialize null'},
    'testIds': ['tests/legacy/vb.test.ts','tests/legacy/culture.test.ts','tests/legacy/state-codec.test.ts'],
    'sourcePreservation': {'databaseFiles': len(inventory), 'changed': 0, 'executableUnchanged': True, 'vendorAssemblyExecuted': False},
    'limitations': ['Static source plus isolated Framework APIs; no vendor runtime/pixel claim', 'State action continuation and detailed field eligibility owned by task4/5; real database persistence task19b', 'Only explicit en-US supported; normal search consumes Binary Like/Compare'],
}
(product / 'evidence/vb-compatibility.json').write_text(json.dumps(evidence, indent=2) + '\n')
# A scoped shared-behavior card, never an assertion that the entire Pipe1 route works.
path = product / 'evidence/parity-ledger.json'
ledger = json.loads(path.read_text())
card = {'id': 'Pipe1:shared-vb-compatibility', 'routeId': 'Pipe1', 'elementId': 'shared-vb-compatibility', 'conditions': ['Only task3 shared conversion/formatting infrastructure under en-US; Pipe1 route remains pending'], 'sourceRefs': [r['sourceRef'] for r in refs if r['method'] in ['FormatDim','DoDrawing','FractionizeIfNeccessary']], 'level': 'confirmed-helper', 'testIds': evidence['testIds'], 'verification': 'passed', 'gaps': []}
ledger = [c for c in ledger if c['id'] != card['id']] + [card]
path.write_text(json.dumps(ledger, indent=2) + '\n')
print(f"Pinned {len(refs)} source methods, {len(framework['cases'])} Framework cases; all {len(inventory)} originals unchanged")
