"""Independent read-only reference preparation; never imports the product parser."""
from pathlib import Path
import hashlib, json, re, sys

source = Path(sys.argv[1] if len(sys.argv) > 1 else '..').resolve()
product = Path(__file__).resolve().parents[2]
audit_path = source / 'audit/data/inventory.json'
audit_bytes = audit_path.read_bytes()
assert hashlib.sha256(audit_bytes).hexdigest() == '046185980a3d5911f533750b6cb1d8c3e44f38ea452c2b1d28f22c50cada7996'
inventory = json.loads(audit_bytes)
tables = {t['path']: t for t in json.loads((source / 'audit/data/tables.json').read_text())}
root = source / 'Database'
current = sorted(p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file())
assert current == sorted(f['path'] for f in inventory)
parameter_files = {'Gensets/ParametersImperial.txt', 'Gensets/ParametersMetric.txt', 'Gensets/ParametersProcessAreaSpansI.txt', 'Gensets/ParametersProcessAreaSpansM.txt', 'Gensets/Sectors.set'}
files = []
for item in inventory:
    path = item['path']
    raw = (root / path).read_bytes()
    assert len(raw) == item['bytes'] and hashlib.sha256(raw).hexdigest() == item['sha256'], path
    kind = {'.csv': 'table', '.dxf': 'template-source', '.png': 'ui-image'}.get(item['extension'], 'not-selected')
    if path in parameter_files:
        kind = 'text'
    entry = {'id': path, 'bytes': item['bytes'], 'sourceHash': item['sha256'], 'kind': kind}
    if path in tables and kind == 'table':
        t = tables[path]
        entry.update(auditHeaderRows=t['header_rows'], auditRecords=t['records'], auditEncoding=t['encoding'])
        entry['layout'] = 'bank' if t['declared_columns'] else ('unresolved' if path == 'Vlfl/Vlv8150_.csv' else 'lookup')
    if kind == 'not-selected':
        entry['reason'] = 'No normal engineering read established for this artifact; retained in inventory, not made a required UI asset.'
    files.append(entry)
policy = {'schemaVersion': 1, 'auditInventory': {'path': 'audit/data/inventory.json', 'hash': hashlib.sha256(audit_bytes).hexdigest()}, 'sourceFileCount': len(files), 'sourceBytes': sum(f['bytes'] for f in files), 'files': files}
(product / 'evidence/catalog-source-manifest.json').write_text(json.dumps(policy, indent=2) + '\n')

# Small selected cell fixtures: physical ReadLine/Split coordinates, not CSV parsing.
# Header row counts come from the independent audit and are metadata only.
selected = ['Flan/Flg150.csv', 'Flhb/Flhb1.csv', 'Piwt/B36-10 2004.csv', 'Piwt/ConverterList.csv', 'Vlfl/Vlv8150_.csv']
selected += [f['path'] for f in inventory if f.get('encoding') == 'cp1252-candidate' and f['extension'] == '.csv']
cases = []
for path in selected:
    raw = (root / path).read_bytes()
    text = raw.decode('utf-8-sig', errors='replace')
    lines = re.split(r'\r\n|\r|\n', text)
    if lines and lines[-1] == '':
        lines.pop()
    rows = [line.split(',') for line in lines]
    coords = {(0, 0), (0, len(rows[0])-1), (len(rows)-1, 0)}
    for target in ['0+1/2', '', 'N/A', '\ufffd']:
        found = next(((r, c) for r, row in enumerate(rows) for c, v in enumerate(row) if v == target), None)
        if found:
            coords.add(found)
    if path.endswith('Flhb1.csv'):
        coords.add((2, 0))
    cases.append({'id': path, 'sourceRefs': [{'path': 'Database/' + path, 'hash': hashlib.sha256(raw).hexdigest()}], 'culture': 'en-US', 'expected': {'sourceHash': hashlib.sha256(raw).hexdigest(), 'rows': len(rows), 'widths': sorted(set(map(len, rows))), 'auditHeaderRows': tables[path]['header_rows'], 'cells': [{'row': r+1, 'column': c+1, 'value': rows[r][c]} for r, c in sorted(coords)]}})
out = product / 'tests/reference/imported'
out.mkdir(parents=True, exist_ok=True)
(out / 'lexical-cells.json').write_text(json.dumps({'basis': 'Independent Python physical-line split plus pinned original bytes/audit metadata; three replacement cells independently confirmed with .NET Framework StreamReader.', 'cases': cases}, indent=2) + '\n')
print(json.dumps({'verifiedFiles': len(files), 'bytes': policy['sourceBytes'], 'fixtureCases': len(cases)}))
