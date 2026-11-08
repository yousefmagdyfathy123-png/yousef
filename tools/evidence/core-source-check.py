"""Verify the immutable core source inventory against the pinned Task 1/2 manifests."""
import hashlib
import json
from pathlib import Path

project = Path(__file__).resolve().parents[2]
root = project.parent
manifest = json.loads((project / 'evidence/catalog-source-manifest.json').read_text(encoding='utf-8'))
index = json.loads((project / 'evidence/route-index.json').read_text(encoding='utf-8'))
expected = {f"Database/{entry['id']}": entry['sourceHash'] for entry in manifest['files']}
actual_files = {path.relative_to(root).as_posix() for path in (root / 'Database').rglob('*') if path.is_file()}
if actual_files != set(expected):
    raise SystemExit('Source Database inventory differs from the pinned manifest')

for entry in [index['artifact'], *index['sources'], manifest['auditInventory']]:
    if expected.setdefault(entry['path'], entry['hash']) != entry['hash']:
        raise SystemExit(f"Conflicting pinned hashes for {entry['path']}")

for filename, digest in sorted(expected.items()):
    actual = hashlib.sha256((root / filename).read_bytes()).hexdigest()
    if actual != digest:
        raise SystemExit(f'Source hash changed for {filename}')

snapshot = hashlib.sha256(json.dumps(expected, sort_keys=True).encode()).hexdigest()
print(json.dumps({
    'files': len(expected),
    'catalogFiles': manifest['sourceFileCount'],
    'differences': 0,
    'snapshotSha256': snapshot,
}))
