"""Pin Task8 source, IL, reference and catalog identities. --accept follows tests."""
import importlib.util,json,re,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('v',Path(__file__).with_name('valves-reference.py'))
v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v);b=v.b
methods=json.loads((b.ROOT/'audit/executable/methods.json').read_text())
by_name={m['name']:m for m in methods if m['type']=='Pipedata_Pro_14_1.Module1'}
ledger_path=b.APP/'evidence/parity-ledger.json';ledger=json.loads(ledger_path.read_text())
index=json.loads((b.APP/'evidence/route-index.json').read_text())
cards=b.APP/'evidence/valves-strainers-fasteners';cards.mkdir(exist_ok=True)
count=0;total=0;unavailable=0;tables=set();drawings=set()
for family,qty in v.FAMILIES.items():
    for n in range(1,qty+1):
        route=family+str(n);p=v.profile(route)
        fixture=v.OUT/(route+'.json');cases=json.loads(fixture.read_text(encoding='utf8'))['cases']
        anchors=[]
        for name in [route,p['header'],'LoadSettings'+family,'LoadDataBase1','GetTitle','GetSubTab','LoadDrawing','DoDrawing','DesigBtn1ValuesForMainSize','FormatDim','ImperialiseWereNecessary','ErrorCatch',p['error']]:
            m=by_name[name];ref=v.f.method(name)[1]
            ref.update(rva=m['rva'],token=f'0x{0x06000000|int(re.search(r"0x([0-9a-f]+)",m["token"])[1],16):08x}')
            anchors.append(dict(method=name,sourceRef=ref,ilSha256=m['il_sha256']))
        paths={path for c in cases for path in c['expected']['files']}
        images={c['expected']['template'] for c in cases if c['expected']['available']}
        tables.update(paths);drawings.update(images)
        source_paths=sorted(paths|images)
        sources=[dict(path='Database/'+path,hash=b.sha((b.ROOT/'Database'/path).read_bytes())) for path in source_paths]
        classification={kind:any(x['id']==route for x in index[kind]) for kind in ['dispatch','uiRoutes','search']}
        failed=sum(not c['expected']['available'] for c in cases)
        card=dict(schemaVersion=1,routeId=route,classification=classification,methods=anchors,
          sourceEvidenceReuse='evidence/catalog-load-evidence.json; same EXE SHA256/MVID; retained REA all1481 IL-body crosscheck',
          fixtures=dict(path=fixture.relative_to(b.APP).as_posix(),hash=b.sha(fixture.read_bytes()),cases=len(cases),unavailableCases=failed),
          dataSources=sources,tests=['tests/legacy/valves-strainers-fasteners.test.ts','tests/legacy/task8-navigation.test.ts','tests/legacy/task8-acceptance.test.ts'],
          originalComparison='unverified-visual-nonblocking',review='Primary agent source/recipe review; no subagent per user request')
        (cards/(route+'.json')).write_text(json.dumps(card,indent=2)+'\n',encoding='utf8',newline='\n')
        if '--accept' in sys.argv:
            item=next(c for c in ledger if c['routeId']==route and c['elementId']=='functional')
            item.update(conditions=['Task8 exact filenames, source table branches, all offered rows, units/list/fractions, eligibility, headings, drawing commands, recovery and serialized prior-bank continuation. '+card['fixtures']['path']],sourceRefs=[a['sourceRef'] for a in anchors[:3]],level='observed-static',testIds=card['tests'],verification='passed',gaps=[])
        count+=1;total+=len(cases);unavailable+=failed
assert count==38
assert b.sha((b.ROOT/'Pipedata-Pro 14.1.exe').read_bytes())=='55a55522875ad7131d1367a08667ae653416c9be2decbd3bd5c54a9b8c04d03c'
inventory=json.loads((b.ROOT/'audit/data/inventory.json').read_text())
for item in inventory:assert b.sha((b.ROOT/'Database'/item['path']).read_bytes())==item['sha256'],item['path']
if '--accept' in sys.argv:ledger_path.write_text(json.dumps(ledger,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(dict(routes=count,cases=total,unavailable=unavailable,distinctTables=len(tables),distinctDrawings=len(drawings),originalFilesVerified=len(inventory),originalExeUnchanged=True,originalModuleUnchanged=True,originalExecuted=False,cardsAccepted='--accept' in sys.argv)))
