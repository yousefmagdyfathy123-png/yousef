"""Bind Task7 references to source/IL identities; --accept updates passed cards.

Run --accept only after reading successful focused verification output.
"""
import importlib.util,json,re,sys,hashlib
from pathlib import Path
spec=importlib.util.spec_from_file_location('f',Path(__file__).with_name('fittings-reference.py'))
f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f);b=f.b
methods=json.loads((b.ROOT/'audit/executable/methods.json').read_text())
by_name={m['name']:m for m in methods if m['type']=='Pipedata_Pro_14_1.Module1'}
ledger_path=b.APP/'evidence/parity-ledger.json';ledger=json.loads(ledger_path.read_text())
count=0;cases_total=0;paths=set();unavailable=0
for fixture in sorted((b.APP/'tests/reference/fittings-pipe-branches').glob('*.json')):
    route=fixture.stem;family=route[:4];cases=json.loads(fixture.read_text(encoding='utf8'))['cases'];anchors=[]
    names=[route,route+'_Headers','LoadSettings','LoadDataBase1','GetTitle','GetSubTab','LoadDrawing','DoDrawing','FormatDim','FractionizeIfNeccessary']
    if 'LoadSettings'+family in by_name:names.append('LoadSettings'+family)
    if family in ['Wbol','Wbpi']:names+=['LoadDataBase2','DesigBtn2ForBranchSize']
    elif family in ['Ftbw','Ftsc','Ftsw']:names+=['DesigBtn1ValuesForMainSize','DesigBtn2ForSmallSize']
    if family=='Fswa':names+=['DesigSwageSmallSizeList','DesigBtn1ForNominalBore2','DesigBtn2ForReducedSize']
    if family=='Piwt':names+=['DesigWallThkList','DesigBtn1ForNominalBore','DesigBtn2ForWallThickness','Convert_Inch_to_Metric','Convert_Metric_to_Inch','Convert_WT_Metric_to_Inch','Convert_WT_Inch_to_Metric','LoadCoverterList','LoadWallThicknessConverter']
    for name in names:
        m=by_name[name];ref=f.method(name)[1];ref.update(rva=m['rva'],token=f'0x{0x06000000|int(re.search(r"0x([0-9a-f]+)",m["token"])[1],16):08x}')
        anchors.append(dict(method=name,sourceRef=ref,ilSha256=m['il_sha256']))
    source_paths={path for c in cases for path in c['expected']['files']}
    if family=='Piwt':source_paths.update(['Piwt/ConverterList.csv','Piwt/WallThicknessConverter.csv'])
    paths.update(source_paths)
    sources=[dict(path='Database/'+p,hash=b.sha((b.ROOT/'Database'/p).read_bytes())) for p in sorted(source_paths)]
    n_unavailable=sum(not c['expected']['available'] for c in cases);unavailable+=n_unavailable;cases_total+=len(cases)
    card=dict(schemaVersion=1,routeId=route,methods=anchors,sourceEvidenceReuse='evidence/catalog-load-evidence.json; matching artifact/MVID and all1481 IL-body crosscheck',fixtures=dict(path=fixture.relative_to(b.APP).as_posix(),hash=b.sha(fixture.read_bytes()),cases=len(cases),unavailableCases=n_unavailable),dataSources=sources,tests=['tests/legacy/fittings-pipe-branches.test.ts','tests/legacy/task7-acceptance.test.ts'],originalComparison='unverified-visual-nonblocking')
    out=b.APP/'evidence/fittings-pipe-branches';out.mkdir(exist_ok=True);(out/(route+'.json')).write_text(json.dumps(card,indent=2)+'\n',encoding='utf8',newline='\n')
    if '--accept' in sys.argv:
        item=next(c for c in ledger if c['routeId']==route and c['elementId']=='functional')
        item.update(conditions=['Task7 source-derived unit tables, offered limits, availability, modes, headers, display commands and retained-bank/serialized continuation; independent references in '+card['fixtures']['path']],sourceRefs=[a['sourceRef'] for a in anchors[:3]],level='observed-static',testIds=card['tests'],verification='passed',gaps=[])
    count+=1
assert count==80,count
assert b.sha((b.ROOT/'Pipedata-Pro 14.1.exe').read_bytes())=='55a55522875ad7131d1367a08667ae653416c9be2decbd3bd5c54a9b8c04d03c'
inventory=json.loads((b.ROOT/'audit/data/inventory.json').read_text())
for item in inventory:assert b.sha((b.ROOT/'Database'/item['path']).read_bytes())==item['sha256'],item['path']
reconciled=0
if '--accept' in sys.argv and '--reconcile-task6-ledger' in sys.argv:
    previous=json.loads((b.APP/'evidence/task6-acceptance.json').read_text())
    assert previous['status']=='complete'
    for old in sorted((b.APP/'evidence/flanges-gaskets').glob('*.json')):
        route=old.stem;item=next(c for c in ledger if c['routeId']==route and c['elementId']=='functional')
        if item['verification']=='passed':continue
        accepted=json.loads(old.read_text());pinned=accepted['fixtures']
        assert b.sha((b.APP/pinned['path']).read_bytes())==pinned['hash'],route
        item.update(conditions=['Previously accepted Task6 route; stale global pending flag reconciled against '+old.relative_to(b.APP).as_posix()+' and fresh full-suite verification.'],sourceRefs=[m['sourceRef'] for m in accepted['methods'][:3]],level='observed-static',testIds=accepted['tests'],verification='passed',gaps=[])
        reconciled+=1
if '--accept' in sys.argv:ledger_path.write_text(json.dumps(ledger,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(dict(routes=count,cases=cases_total,unavailable=unavailable,distinctTables=len(paths),originalFilesVerified=len(inventory),originalExeUnchanged=True,originalExecuted=False,cardsAccepted='--accept' in sys.argv,previousTask6LedgerFlagsReconciled=reconciled)))
