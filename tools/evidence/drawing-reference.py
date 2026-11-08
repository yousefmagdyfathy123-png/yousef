"""Task5 independent fixtures from the pre-existing analyst audit, never from TS.
Does not execute vendor code. Fingerprints use scaled integer coordinates to avoid
cross-language JSON float spelling; values are already rounded by analyst Python.
"""
from pathlib import Path
import json, hashlib, collections, re
root = Path(__file__).resolve().parents[3]
audit = root/'audit'/'recheck-2026-11-01'
rows = json.loads((audit/'drawing-parser.json').read_text())
records = json.loads((audit/'drawing-parser-accepted-lines.json').read_text())
by_file = collections.defaultdict(list)
for r in records:
    by_file[r['path']].append([r['token_index'], r['source_line'], *[round(n*1000) for n in r['coords_rounded']], r['color_token'], r['internal_color'], r['marker_index']])
files = []
for f in rows['files']:
    records_json = json.dumps(by_file[f['path']], separators=(',', ':'))
    source = root/f['path']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == f['sha256']
    files.append(dict(id=f['path'].replace('Database\\','').replace('\\','/'), sourceHash=f['sha256'], captured=f['captured_tokens'], count=f['accepted_line_count'], markers=f['marker_indices'], fingerprint=hashlib.sha256(records_json.encode()).hexdigest(), classification='zero-record; not selected by inspected normal source branches' if not f['accepted_line_count'] else 'analyst fresh-state profile; file acceptance does not establish route reachability'))
out = root/'alfadata'/'tests'/'reference'/'drawing'
out.mkdir(parents=True, exist_ok=True)
(out/'corpus.json').write_text(json.dumps(dict(sourceRefs=[dict(path='audit/recheck-2026-11-01/drawing-parser-accepted-lines.json', hash=hashlib.sha256((audit/'drawing-parser-accepted-lines.json').read_bytes()).hexdigest())], initial='Fresh c=0,colr=0,linetype=0; not runtime-global totals', files=files), indent=2)+'\n', encoding='utf-8', newline='\n')
print(f'Independent drawing corpus: {len(files)} files; {sum(f["count"] for f in files)} accepted records')
app = root/'alfadata'
source = root/'audit'/'executable'/'Pipedata_Pro_14_1.Module1.cs'
source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
assert source_hash == 'ae2389a910a610523c4e012acf3e65be4f7458c7ca9fdbb0d83d5e2c63d13c6a'
text = source.read_text(encoding='utf-8-sig')
methods=json.loads((root/'audit/executable/methods.json').read_text())
names=['GotoForm','LoadDrawing','Drawlines1','DoDrawing','GetSubTab','DropSubTab','FormatDim','ImperialiseWereNecessary','FractionizeIfNeccessary']
refs=[]
for name in names:
    m=next(m for m in methods if m['type']=='Pipedata_Pro_14_1.Module1' and m['name']==name)
    match=re.search(r'public static void '+name+r'\(',text); assert match,name
    refs.append(dict(method=name,sourceRef=dict(path=source.relative_to(root).as_posix(),hash=source_hash,line=text.count('\n',0,match.start())+1,token=f'0x{0x06000000|int(re.search(r"0x([0-9a-f]+)",m["token"])[1],16):08x}',rva=m['rva']),ilSha256=m['il_sha256']))
manifest=json.loads((app/'evidence/catalog-source-manifest.json').read_text())
for f in manifest['files']: assert hashlib.sha256((root/'Database'/f['id']).read_bytes()).hexdigest()==f['sourceHash'],f['id']
assert hashlib.sha256((root/'Pipedata-Pro 14.1.exe').read_bytes()).hexdigest()=='55a55522875ad7131d1367a08667ae653416c9be2decbd3bd5c54a9b8c04d03c'
temperature=json.loads((out/'temperature.json').read_text())
helper=app/'tools/evidence/drawing-framework-reference.ps1'
assert temperature['helperHash']==hashlib.sha256(helper.read_bytes()).hexdigest()
evidence=dict(schemaVersion=1,scope='Task5 shared drawing protocol; no completed engineering route or browser renderer',methods=refs,artifact=dict(hash='55a55522875ad7131d1367a08667ae653416c9be2decbd3bd5c54a9b8c04d03c',mvid='948a0d3b-1670-4555-9843-5e7ed73785db'),reaReuse=dict(path='evidence/catalog-load-evidence.json',scope='same artifact, all1481 raw IL bodies crosschecked; extended by source and display IL anchors'),sourcePreservation=dict(files=len(manifest['files']),changed=0,executableUnchanged=True),profile=dict(initial='Fresh c/colr/linetype=0 per file; no runtime-global claim',files=len(files),records=sum(f['count'] for f in files),markers=sum(len(f['markers']) for f in files)),fixtures=dict(path='tests/reference/drawing/corpus.json',hash=hashlib.sha256((out/'corpus.json').read_bytes()).hexdigest()),framework=dict(path='tests/reference/drawing/temperature.json',hash=hashlib.sha256((out/'temperature.json').read_bytes()).hexdigest(),helperHash=temperature['helperHash'],runtime=temperature['runtime'],cases=len(temperature['cases'])),visualVerification='unverified-visual-nonblocking',stateSchema=3,codecVersion=1)
(app/'evidence/drawing-compatibility.json').write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8')
ledger_path=app/'evidence/parity-ledger.json'
ledger=json.loads(ledger_path.read_text())
card=dict(id='Flan1:shared-drawing-protocol',routeId='Flan1',elementId='shared-drawing-protocol',conditions=['Task5 shared infrastructure only; Flan1 route remains pending','fresh corpus profile','previous color/token/line memory','labels before linework','Ptem crosshair'],sourceRefs=[r['sourceRef'] for r in refs],level='observed-static',testIds=['tests/legacy/drawing.test.ts'],verification='passed',gaps=[])
cards=ledger if isinstance(ledger,list) else ledger['cards']
cards[:]=[c for c in cards if c['id'] not in [card['id'],'shared:drawing-protocol']];cards.append(card)
ledger_path.write_text(json.dumps(ledger,indent=2)+'\n',encoding='utf-8')
print(f'Source/IL anchors: {len(refs)}; unchanged originals: {len(manifest["files"])} plus executable')
