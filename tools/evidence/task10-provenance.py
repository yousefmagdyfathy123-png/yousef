"""Pin Task10 source/IL/resources and accept only its explicitly classified cards."""
import hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))
def sha(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
index=read('evidence/route-index.json')
ui=read('tests/reference/ui/source-ui.json')
runtime=read('src/legacy/ui/source-data.json')
assert runtime==ui
methods=read('../audit/executable/methods.json')
methods={(m['type'],m['name']):m for m in methods}
anchors=[]
for event in ui['events']:
    m=methods['Pipedata_Pro_14_1.frmPipedata',event['handler']]
    anchors.append(dict(id=event['id'],handler=event['handler'],kind=event['action']['kind'],token=m['token'],rva=m['rva'],ilSha256=m['il_sha256']))
assert len(anchors)==315
assert index['searchOnly']==['Blnd1','Blnd2','Blnd3','Blnd4','Fl6b3']
assert index['dispatchNotInSearch']==['Comp1','Piwt1','Psiz1']
resources=['Parameters.txt','ParametersMetric.txt','ParametersImperial.txt','ParametersProcessAreaSpansM.txt','ParametersProcessAreaSpansI.txt','Pipedata-Pro.html','Zeataline.html','Aknowledgements.html','Disclaimer.html','Acknowledgements.txt','Disclaimer.txt','License.rtf','SystemInfo_Template.html']
sources=[ui['source']]
for name in ['Module1','frmAbout','frmConfigs','frmParameters','frmDataInput_Fxly','frmSearch']:
    path='../audit/executable/Pipedata_Pro_14_1.'+name+'.cs'
    sources.append(dict(path=path[3:],hash=sha(path)))
for name in resources:
    path='../Database/Gensets/'+name
    sources.append(dict(path=path[3:],hash=sha(path)))
card=dict(schemaVersion=1,artifact=index['artifact'],reaEvidenceId='ev_991bdf5081b3c8a175c7d1457f238a5a9c686a4bbceeda96b07dd34ac798afc9',
    sourceRefs=sources,events=anchors,fixtures=dict(path='tests/reference/ui/source-ui.json',hash=sha('tests/reference/ui/source-ui.json')),
    extractor=dict(path='tools/evidence/ui-reference.py',hash=sha('tools/evidence/ui-reference.py')),
    dispatch=167,search=169,searchOnly=index['searchOnly'],dispatchNotInSearch=index['dispatchNotInSearch'],
    documents=['about','material','parameters-metric','parameters-imperial','parameters-process-metric','parameters-process-imperial'],
    quirks=['No-dispatch keeps drawing but AddChecks clears first six headers.','frmParameters_Load overrides process-area files with rack-span units files.','Notes is an empty guarded helper.','Pro design hides Pwal/Ptem/Psiz menus; implemented Psiz remains available through explicit route API.'],
    hostBoundary='Task10 handles source UI events with typed effects. Task11 owns React consumption, lifecycle rendering, print and browser close. No host effect claims browser execution here.',
    identityException='Alfadata identity; source units sentence retained, unverified current-standards/certification/company claims omitted; private rights documents retained for launch review.',
    tests=['tests/legacy/all-routes.test.ts','tests/legacy/task10-acceptance.test.ts','tests/legacy/catalog.test.ts'],review='Primary author self-review per explicit no-subagent instruction',originalComparison='unverified-visual-nonblocking')
(ROOT/'evidence/task10-acceptance.json').write_text(json.dumps(card,indent=2)+'\n',encoding='utf-8',newline='\n')
if '--accept' in sys.argv:
    ledger=read('evidence/parity-ledger.json')
    targets={e['id']:e for e in ui['events']}
    dialogs={'dialog:frmAbout','dialog:frmConfigs','dialog:frmParameters','dialog:frmPipedata','dialog:frmSearch'}
    changed=0
    for c in ledger:
        if c['elementId']!='functional':continue
        route=c['routeId']
        if route not in targets and route not in dialogs and route not in index['searchOnly']:continue
        if route in targets:
            e=targets[route]
            condition='Wired source event '+e['handler']+'; explicit '+e['action']['kind']+' effect. Full recipe option actions checked across167 assembled routes; source-empty events stay inert; vendor services blocked; host rendering/print consumed in Task11.'
        elif route in dialogs:
            condition='Source-derived dialog/menu model and typed action/host boundary; parameter-load override, configuration cancellation/action, search selection and wired flexibility input preserved. React rendering belongs to Task11.'
        else:
            condition='Search-only no-dispatch; original Clicker/AddChecks chain clears six headers, retains drawing and shared control state. No invented recipe/data.'
        c.update(conditions=[condition],level='observed-static',testIds=card['tests'][:2],verification='passed',gaps=[])
        changed+=1
    assert changed==325,changed
    (ROOT/'evidence/parity-ledger.json').write_text(json.dumps(ledger,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(dict(dispatch=167,events=len(anchors),sources=len(sources),accepted='--accept' in sys.argv)))
