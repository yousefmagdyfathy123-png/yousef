"""Independent read-only source constants/reference preparation, never product imports."""
from pathlib import Path
import re, json, hashlib
root = Path(__file__).resolve().parents[2]
source = root.parent
path = source/'audit/executable/Pipedata_Pro_14_1.Module1.cs'
raw = path.read_bytes()
assert hashlib.sha256(raw).hexdigest() == 'ae2389a910a610523c4e012acf3e65be4f7458c7ca9fdbb0d83d5e2c63d13c6a'
text = raw.decode('utf-8-sig')
body = text[text.index('\tpublic static void AddDefaultSettings()'):text.index('\tpublic static void AddDefaultSettings_Old()')]
assignments = {}
for m in re.finditer(r'if \(Operators.CompareString\(Strings.Mid\(ActiveTab, 1, 4\), "([^"]+)", TextCompare: false\) == 0\)\s*\{', body):
    start=m.end(); depth=1; end=start
    while depth:
        depth += (body[end]=='{')-(body[end]=='}'); end+=1
    block=body[start:end-1]
    # Top-level assignments only. Ftbw11 nested override is independently listed below.
    block=block.split('if (')[0]
    values={}
    for field, expression in re.findall(r'\b(\w+) = ([^;]+);',block):
        if expression.startswith('Conversions.ToSingle('): value=float(re.search(r'"([^"]+)"',expression)[1])
        elif expression.startswith('Conversions.ToString('): value=re.search(r'\(([^)]+)\)',expression)[1]
        elif expression.startswith('"'): value=json.loads(expression)
        else: value=float(expression.rstrip('f')) if '.' in expression else int(expression.rstrip('f'))
        values[field]=value
    # AddDefaultSettings uses sequential independent ifs; Fswa occurs twice.
    assignments.setdefault(m[1],{}).update(values)
index=json.loads((root/'evidence/route-index.json').read_text())
ids=sorted({r['id'] for key in ['dispatch','search','uiRoutes'] for r in index[key]})
fixtures=[]
for route in ids:
    values=assignments.get(route[:4],{}).copy()
    if route=='Ftbw11': values['Sch']='10s'
    fixtures.append({'id':route,'expected':values})
target=root/'tests/reference/state'; target.mkdir(exist_ok=True)
(target/'defaults.json').write_text(json.dumps({'sourceRef':{'path':'audit/executable/Pipedata_Pro_14_1.Module1.cs','hash':hashlib.sha256(raw).hexdigest(),'line':41157},'cases':fixtures},indent=2)+'\n')
# Runtime registry contains opaque ids only, not original resources or audit source.
(root/'src/legacy/route-ids.json').write_text(json.dumps({'dispatch':[r['id'] for r in index['dispatch']],'noDispatch':sorted(set(ids)-{r['id'] for r in index['dispatch']})},indent=2)+'\n')
print(f'Prepared {len(fixtures)} independent default selections, {len(assignments)} source family branches')

start=text.index('public static void GetTitle()')
title_body=text[start:text.index('\n\tpublic static ',start+10)]
titles={}
for m in re.finditer(r'if \(Operators.CompareString\(Strings.Mid\(ActiveTab, 1, 4\), "([^"]+)", TextCompare: false\) == 0\)\s*\{',title_body):
    start=m.end(); depth=1; end=start
    while depth:
        depth+=(title_body[end]=='{')-(title_body[end]=='}');end+=1
    block=title_body[start:end-1];variables={'ActivitySpec':'','ActivitySpecLong':'','ActivityTitle':''}
    for key,expr in re.findall(r'(ActivitySpec|ActivitySpecLong|ActivityTitle) = ([^;]+);',block):
        parts=re.findall(r'"(?:[^"\\]|\\.)*"|ActivitySpec',expr)
        variables[key]=''.join(json.loads(p) if p.startswith('"') else variables[p] for p in parts)
    tabs={int(i):json.loads(value) for i,value in re.findall(r'TabArray\[(\d+)\] = ("[^"\n]*");',block)}
    labels={}
    for label in re.finditer(r'TitleArray\[([^\n]+?)\] = ("[^"\n]*");',block):
        if label[1].isdigit(): i=int(label[1])
        else:
            conditions=re.findall(r'ConditionalCompareObjectEqual\(CounterResult\d*, (\d+), TextCompare: false\)',block[:label.start()])
            assert conditions, (m[1],label[0])
            i=int(conditions[-1])
        labels[i]=json.loads(label[2])
    titles[m[1]]={**variables,'routes':{route:labels[i] for i,route in tabs.items() if i in labels}}
(root/'src/legacy/state/title-data.json').write_text(json.dumps(titles,indent=2)+'\n')
print('Source title families:',len(titles),'Flan1:',titles['Flan']['routes'].get('Flan1'))

# Static identity/provenance only: never commit reconstructed source or IL bodies.
methods=json.loads((source/'audit/executable/methods.json').read_text())
extra={'Clicker','AddDefaultSettings','GetTitle','AddChecks','LoadConfigs','SaveConfigs','Find','LoadSearchFile','SaveTablist','LoadTabList','ErrorCatch','WhiteBlock','ClearHeaderText','DesigClassFaceSchRatingEtc','Convert_Inch_to_Metric','Convert_Metric_to_Inch','Convert_WT_Metric_to_Inch','Convert_WT_Inch_to_Metric','Flan1_Headers','Btn3Selected'}
refs=[]
for m in methods:
    if m['type']!='Pipedata_Pro_14_1.Module1' or not(m['name'] in extra or m['name'].startswith(('LoadSettings','SaveSettings'))):continue
    match=re.search(r'public static void '+re.escape(m['name'])+r'\(',text)
    assert match,m['name']
    token=0x06000000|int(re.search(r'0x([0-9a-f]+)',m['token'])[1],16)
    refs.append({'method':m['name'],'sourceRef':{'path':'audit/executable/Pipedata_Pro_14_1.Module1.cs','hash':hashlib.sha256(raw).hexdigest(),'line':text.count('\n',0,match.start())+1,'token':f'0x{token:08x}','rva':m['rva']},'ilSha256':m['il_sha256']})
ui=[]
for file,names in {'frmConfigs':['Button4_Click'],'frmSearch':['frmSearch_Load','Button4_Click','ListBox1_SelectedIndexChanged','TextBox1_KeyPress'],'frmPipedata':['ToolStripMenuItem1_Click_1','ToolStripMenuItem2_Click']}.items():
    p=source/f'audit/executable/Pipedata_Pro_14_1.{file}.cs';r=p.read_bytes();t=r.decode('utf-8-sig')
    for name in names:
        m=next(m for m in methods if m['type']==f'Pipedata_Pro_14_1.{file}' and m['name']==name)
        a=re.search(r'private void '+re.escape(name)+r'\(',t);assert a
        ui.append({'method':f'{file}.{name}','sourceRef':{'path':p.relative_to(source).as_posix(),'hash':hashlib.sha256(r).hexdigest(),'line':t.count('\n',0,a.start())+1,'rva':m['rva']},'ilSha256':m['il_sha256']})
inventory=json.loads((source/'audit/data/inventory.json').read_text())
for item in inventory:assert hashlib.sha256((source/'Database'/item['path']).read_bytes()).hexdigest()==item['sha256'],item['path']
assert hashlib.sha256((source/'Pipedata-Pro 14.1.exe').read_bytes()).hexdigest()==index['artifact']['hash']
framework={}
for name in ['search','configure']:
    p=target/f'{name}.json';f=json.loads(p.read_text(encoding='utf-8'));script=root/f'tools/evidence/state-{name if name=="search" else "config"}-reference.ps1'
    assert f['helperHash']==hashlib.sha256(script.read_bytes()).hexdigest()
    framework[name]={'path':p.relative_to(root).as_posix(),'hash':hashlib.sha256(p.read_bytes()).hexdigest(),'cases':len(f['cases']),'runtime':f['runtime'],'culture':f['culture'],'helperHash':f['helperHash']}
evidence={'schemaVersion':1,'scope':'Task4 shared state/selector/search infrastructure only, not route calculations','artifact':index['artifact'],'methods':refs,'constructedHandlers':ui,'framework':framework,'sourcePreservation':{'files':len(inventory),'changed':0,'executableUnchanged':True},'reaReuse':{'path':'evidence/catalog-load-evidence.json','scope':'same-artifact all1481 raw-IL-body crosscheck; static evidence, no vendor execution'},'tests':['tests/legacy/state.test.ts','tests/legacy/state-codec.test.ts'],'stateSchema':2,'codecVersion':1,'functionalRoutesCompleted':0,
    'textResultInventory':{'surfaces':['headers1–7','visible control text/options','source dimension labels/units','unavailable messages'], 'representativeFlan1':[
      {'label':'Flange Wt =  ','valueSource':'Flange_wt','unitSource':'WeightSign'},
      {'label':'S/Bolts and Nuts =  ','valueSource':'TempString','unitSource':'WeightSign'},
      {'label':'StudBolt Size : ','valueSource':'bank1 columns21/26/(22+FaceIndex)','unitSource':'literal UNC/M plus Inchsign'},
      {'label':'RTJ Distance Between Flgs : ','valueSource':'bank1 column16','unitSource':'Inchsign','condition':'RTJ'},
      {'label':'RTJ Ring No : ','valueSource':'bank1 column15','unitSource':'none','condition':'RTJ'}],
      'implementation':'Minimal private/public text-results types and unavailable status; route numeric rows, strict public projection, browser results panel remain recipe/task6a/11 acceptance. No labels guessed from drawing coordinates.'}}
(root/'evidence/state-compatibility.json').write_text(json.dumps(evidence,indent=2)+'\n')
# Shared infrastructure card only; never close a required functional route card.
ledger_path=root/'evidence/parity-ledger.json';ledger=json.loads(ledger_path.read_text())
card={'id':'Flan1:shared-state-infrastructure','routeId':'Flan1','elementId':'shared-state-infrastructure','conditions':['Task4 shared state/selector/search mechanics; synthetic render adapters do not accept route calculations'],'sourceRefs':[r['sourceRef'] for r in refs if r['method'] in ['Clicker','LoadSettings','AddDefaultSettings','AddChecks','Find','ErrorCatch']],'level':'confirmed-helper','testIds':evidence['tests'],'verification':'passed','gaps':[]}
ledger=[c for c in ledger if c['id']!=card['id']]+[card]
ledger_path.write_text(json.dumps(ledger,indent=2)+'\n')
print(f'Pinned {len(refs)} module methods and {len(ui)} constructed handlers; rehashed all {len(inventory)} original data files')
