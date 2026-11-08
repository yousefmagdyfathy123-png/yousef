"""Task9 source/IL/table/fixture identities. --accept only after verified tests."""
import importlib.util,json,re,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('c',Path(__file__).with_name('calculators-reference.py'))
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c);b=c.b
methods=json.loads((b.ROOT/'audit/executable/methods.json').read_text())
byname={m['name']:m for m in methods if m['type']=='Pipedata_Pro_14_1.Module1'}
ledger_path=b.APP/'evidence/parity-ledger.json';ledger=json.loads(ledger_path.read_text())
index=json.loads((b.APP/'evidence/route-index.json').read_text());cards=b.APP/'evidence/calculators';cards.mkdir(exist_ok=True)
total=unavailable=0;tables=set();drawings=set()
for route in c.ROUTES:
    fixture=c.OUT/(route+'.json');cases=json.loads(fixture.read_text(encoding='utf8'))['cases']
    names=[route,route+'_Headers','GetTitle','GetSubTab','LoadDrawing','DoDrawing','LoadDataBase1','ErrorCatch','FormatDim']
    if route.startswith('Gpas'):names += [route+'_CalcSpacing','DesigBtn2ForPipe2Size','DesigBtn3ForPipe2Size','DesigBtn4ForPipe2Size','LoadSettingsGpas']
    if route.startswith('Comp'):names += ['DesigBtn2ForSmallSize']
    if route.startswith('Span'):names += ['Calc_Safe_Span','CalcInsulWt','ClacWeightPerMtr_ForSafeSpan','ClacWeightPerMtrAndWtr_ForSafeSpan','CalcMomentOfInertia_ForSafeSpan','LoadSettingsSpan']
    if route.startswith('Fxly'):names += ['Calc_Leg' if route=='Fxly1' else 'Calc_LoopLeg','LoadSettingsFxly']
    if route=='Psiz1':names += ['PsizCalculate','DesigBtn3ForFlowRate']
    anchors=[dict(method=n,sourceRef={**c.f.method(n)[1],'rva':byname[n]['rva'],'token':byname[n]['token']},ilSha256=byname[n]['il_sha256']) for n in names]
    paths={path for case in cases for path in case['expected']['files']}
    images={route[:4]+'/'+route+'.dxf'}
    if route.startswith('Fxly'):images.add('Fxly/'+route+'a.dxf')
    tables.update(paths);drawings.update(images)
    sources=[dict(path='Database/'+p,hash=b.sha((b.ROOT/'Database'/p).read_bytes())) for p in sorted(paths|images)]
    failed=sum(not case['expected']['available'] for case in cases);total+=len(cases);unavailable+=failed
    tests=['tests/legacy/calculators.test.ts','tests/legacy/calculator-recipes.test.ts','tests/legacy/task9-acceptance.test.ts']
    card=dict(schemaVersion=1,routeId=route,classification={k:any(x['id']==route for x in index[k]) for k in ['dispatch','uiRoutes','search']},methods=anchors,sourceEvidenceReuse='Retained REA managed source/MVID and all1481 IL body crosscheck; no executable or vendor assembly loaded',fixtures=dict(path=fixture.relative_to(b.APP).as_posix(),hash=b.sha(fixture.read_bytes()),cases=len(cases),unavailableCases=failed),framework=dict(path='tests/reference/calculators/framework.json',hash=b.sha((c.OUT/'framework.json').read_bytes())),dataSources=sources,tests=tests,review='Primary agent self-review per user; no subagent',originalComparison='unverified-visual-nonblocking')
    (cards/(route+'.json')).write_text(json.dumps(card,indent=2)+'\n',encoding='utf8',newline='\n')
    if '--accept' in sys.argv:
        item=next(x for x in ledger if x['routeId']==route and x['elementId']=='functional')
        item.update(conditions=['Task9 independent full views/banks/drawings; every offered primary table row per file/sensor; class/units/list/fraction/insulation/material/schedule/cooling branches; linked dialog errors and restoration. '+card['fixtures']['path']],sourceRefs=[a['sourceRef'] for a in anchors[:3]],level='observed-static',testIds=tests,verification='passed',gaps=[])
source=b.SOURCE.read_text(encoding='utf-8-sig');form=(b.ROOT/'audit/executable/Pipedata_Pro_14_1.frmPipedata.cs').read_text(encoding='utf-8-sig')
assert len(re.findall(r'\bPwal1\s*\(',source))==1
assert len(re.findall(r'\bPwalCalculate\s*\(',source))==2
assert len(re.findall(r'\bPtemCalculate\s*\(',source))==1
clicker=c.f.method('Clicker')[0]
for name in ['Pwal','Ptem']:
    assert not re.search(r'case "'+name,clicker)
    assert not re.search(r'\b'+name+r'\d*\(',form)
classification=dict(routes=['Pwal1','Ptem1'],behavior='no-dispatch; prior drawing retained; shared Clicker title/settings/checks still run',menuChain=['constructed ToolStripMenuItem.Click -> ActiveSubSector -> LoadActiveSubSector -> SaveActiveTab -> Clicker'],wall='Pwal1 has no caller; PwalCalculate only called by Pwal1_Headers, whose sole caller is unreachable Pwal1',pressure='PtemCalculate has no caller',pipeWeight='Piwt1 performs lexical bore/wall lookup and weight headers; no Pwal/Ptem helper calls',deadHelpersNotActivated=True,sourceRefs=[c.f.method(n)[1] for n in ['Clicker','LoadActiveSubSector','Pwal1','Pwal1_Headers','PwalCalculate','PtemCalculate','Piwt1']])
(cards/'pressure-wall-classification.json').write_text(json.dumps(classification,indent=2)+'\n',encoding='utf8',newline='\n')
if '--accept' in sys.argv:
    for route in ['Pwal1','Ptem1']:
        item=next(x for x in ledger if x['routeId']==route and x['elementId']=='functional')
        item.update(conditions=['Source-proven constructed menu/Clicker no-dispatch path, including prior drawing retention. Dead interpolation/thickness/schedule helpers are not functional paths and are not activated.'],sourceRefs=classification['sourceRefs'][:2],level='observed-static',testIds=['tests/legacy/calculators.test.ts','tests/legacy/task9-acceptance.test.ts'],verification='passed',gaps=[])
    item=next(x for x in ledger if x['routeId']=='dialog:frmDataInput_Fxly' and x['elementId']=='functional')
    item.update(conditions=['Wired Button4_Click; isolated .NET4 fixtures for all four ActiveData branches in both unit/culture choices, assignment-before-error, silent temperature errors, Imperial lower-bound quirk; engine failed-input display preservation and correction.'],level='confirmed-helper',testIds=['tests/legacy/calculators.test.ts','tests/legacy/task9-acceptance.test.ts'],verification='passed',gaps=[])
assert b.sha((b.ROOT/'Pipedata-Pro 14.1.exe').read_bytes())=='55a55522875ad7131d1367a08667ae653416c9be2decbd3bd5c54a9b8c04d03c'
inventory=json.loads((b.ROOT/'audit/data/inventory.json').read_text())
for item in inventory:assert b.sha((b.ROOT/'Database'/item['path']).read_bytes())==item['sha256'],item['path']
if '--accept' in sys.argv:ledger_path.write_text(json.dumps(ledger,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(dict(routes=len(c.ROUTES),cases=total,frameworkCases=len(json.loads((c.OUT/'framework.json').read_text(encoding='utf8'))['cases']),unavailable=unavailable,tables=len(tables),drawings=len(drawings),originalFilesVerified=len(inventory),originalExeUnchanged=True,originalModuleUnchanged=True,originalExecuted=False,accepted='--accept' in sys.argv)))
