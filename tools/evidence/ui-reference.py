"""Extract inert UI facts from pinned decompilation; never load vendor code."""
import hashlib, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT.parent / 'audit/executable'
def source(name):
    path = SOURCE / ('Pipedata_Pro_14_1.' + name + '.cs')
    return path.read_text(encoding='utf-8-sig'), {'path': path.relative_to(ROOT.parent).as_posix(), 'hash': hashlib.sha256(path.read_bytes()).hexdigest()}
def methods(text):
    starts = list(re.finditer(r'^\t(?:public|private|internal|protected) (?:static )?[\w.<>\[\],]+ (\w+)\([^\n]*\)', text, re.M))
    return {m[1]: text[m.end():starts[i+1].start() if i+1<len(starts) else len(text)].strip() for i,m in enumerate(starts)}

form, ref = source('frmPipedata')
ms = methods(form)
index = json.loads((ROOT/'evidence/route-index.json').read_text())
events = []
for e in index['events']:
    body, control = ms[e['handler']], e['controlId']
    action = None
    route = re.search(r'Module1.ActiveTab = "([^"]+)"', body)
    family = re.search(r'Module1.ActiveSubSector = "([^"]+)"', body)
    selected = re.search(r'Module1.ItemSelected = (\d+);\s*Module1.(Btn\d)Selected', body)
    if selected: action = {'kind':'option', 'button':selected[2], 'index':int(selected[1])}
    elif route: action = {'kind':'route','routeId':route[1]}
    elif family: action = {'kind':'family','family':family[1]}
    elif re.fullmatch(r'Combo1_Tab\d+', control): action = {'kind':'subtab','index':int(control[10:])}
    elif body.strip('{} \t\r\n') == '': action = {'kind':'empty'}
    elif control == '$form': action = {'kind':'lifecycle','event':e['event']}
    elif re.fullmatch(r'Btn[2-6]', control): action = {'kind':'input','button':control}
    elif 'TablistIndex++' in body: action = {'kind':'history','direction':'forward'}
    elif 'TablistIndex--' in body: action = {'kind':'history','direction':'back'}
    elif 'TabbCount' in body and control in ['ToolStripButton1','ToolStripButton2','ToolStripButton3','ToolStripButton4']:
        action = {'kind':'navigate','direction':{'ToolStripButton1':'first','ToolStripButton2':'previous','ToolStripButton3':'next','ToolStripButton4':'last'}[control]}
    elif 'frmAbout.Show()' in body: action = {'kind':'dialog','dialog':'about'}
    elif 'frmConfigs.Show()' in body: action = {'kind':'dialog','dialog':'configuration'}
    elif 'frmSearch.Show()' in body: action = {'kind':'dialog','dialog':'search','toggle':True}
    elif 'frmParameters' in body: action = {'kind':'dialog','dialog':'parameters'}
    elif 'PrintDialog' in body: action = {'kind':'print'}
    elif 'Process.Start' in body: action = {'kind':'vendor-link','messages':re.findall(r'Interaction.MsgBox\("([^"]+)"',body)}
    elif 'SaveSizeAndLocation()' in body and 'Close()' in body: action = {'kind':'close'}
    elif 'AllBtnsWhite()' in body: action = {'kind':'dismiss'}
    else: raise ValueError('Unclassified event '+e['handler']+' '+body[:300])
    events.append({'id':f"event:{control}:{e['event']}", 'controlId':control, 'event':e['event'], 'handler':e['handler'], 'action':action, 'sourceRefs':e['sourceRefs']})

controls = {}
for m in re.finditer(r'this\.(\w+)\.(Text|ToolTipText|Enabled|Visible|Checked) = ("(?:[^"\\]|\\.)*"|true|false);', form):
    control, key, value = m.groups()
    controls.setdefault(control,{})[key] = json.loads(value)
module, module_ref = source('Module1')
pro = methods(module)['DesigMenusForPipedataPro']
for control, value in re.findall(r'frmPipedata\.(\w+)\.Visible = (true|false);',pro):
    controls.setdefault(control,{})['Visible'] = value == 'true'
family_visibility = {}
title_source = methods(module)['GetTitle']
starts = list(re.finditer(r'if \(Operators.CompareString\(Strings.Mid\(ActiveTab, 1, 4\), "([^"]+)"',title_source))
for i,m in enumerate(starts):
    block=title_source[m.start():starts[i+1].start() if i+1<len(starts) else len(title_source)]
    visible=re.search(r'frmPipedata.Combo1.Visible = (true|false);',block)
    if visible:family_visibility[m[1]]=visible[1]=='true'
data = {'source':ref, 'edges':index['menuEdges'], 'controls':controls, 'events':events, 'familyTitleVisibility':family_visibility}
out = ROOT/'tests/reference/ui'
out.mkdir(parents=True,exist_ok=True)
(out/'source-ui.json').write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8',newline='\n')
runtime = ROOT/'src/legacy/ui'
runtime.mkdir(parents=True,exist_ok=True)
(runtime/'source-data.json').write_text(json.dumps(data,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'events':len(events),'kinds':sorted(set(e['action']['kind'] for e in events)),'controls':len(controls)}))
