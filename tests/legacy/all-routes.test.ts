import { expect,test,vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { allRoutes,allRouteRegistry } from '../../src/legacy/features';
import { getLegacyMenu,handleLegacyUiEvent } from '../../src/legacy/ui/menus';
import { getLegacyDocument,sanitizeLegacyHtml } from '../../src/legacy/ui/notes';
import { getLegacyDialog,dialogWorkAction } from '../../src/legacy/ui/dialogs';
import { checkAssemblyCoverage } from '../../tools/evidence/coverage';
import { createInitialState } from '../../src/legacy/state/initial';
import { transition } from '../../src/legacy/state/transition';
import { loadCatalog } from '../../src/server/catalog';
import ids from '../../src/legacy/route-ids.json';
import fixture from '../reference/ui/source-ui.json';
vi.mock('server-only',()=>({}));
const catalog=await loadCatalog(resolve('private/catalog'));
const initial=()=>createInitialState({name:'en-US',decimalSeparator:'.',groupSeparator:','});
const loaded=(routeId='Flan1')=>transition(initial(),{type:'select-route',routeId},catalog);

test('assembled registry covers all167 dispatch routes exactly once',()=>{
  expect(allRoutes.map(r=>r.id).sort()).toEqual([...ids.dispatch].sort());
  expect(new Set(allRoutes.map(r=>r.id)).size).toBe(167);
  for(const id of ids.noDispatch)expect(allRouteRegistry.classify(id)).toBe('no-dispatch');
});
test.each(ids.dispatch)('%s is available through the default transition registry',routeId=>{
  const result=loaded(routeId);
  expect(result.state.routeId).toBe(routeId);expect(result.view.messages).toEqual([]);
  expect(result.trace.some(t=>t.operation==='error-recovery')).toBe(false);
  for(const control of result.view.controls){
    for(const [i,option] of control.options.entries()){
      const event=fixture.events.find(e=>e.controlId===control.sourceId+'_'+(i+1)&&e.event==='Click');
      if(!event)continue;
      const effect=handleLegacyUiEvent(result.state,event.id);
      expect(effect).toEqual(control.visible&&control.enabled&&option.enabled?{kind:'work',action:{type:'select-option',controlId:control.id,value:option.value}}:{kind:'none'});
    }
  }
});
test.each(ids.noDispatch)('%s retains the previous display without fabricated data',routeId=>{
  const first=loaded();const next=transition(first.state,{type:'select-route',routeId},catalog);
  expect(next.view.drawing).toEqual(first.view.drawing);
  expect(next.view.headers).toEqual(['','','','','','',first.view.headers[6]]);
  expect(next.trace).toContainEqual({operation:'no-dispatch',sourceId:routeId});
});
test('source menu order, checked family, hidden pressure views and forbidden vendor actions',()=>{
  const menu=getLegacyMenu(loaded().state),find=(id:string)=>menu.find(c=>c.id===id)!;
  expect(find('MenuStrip1').options.map(o=>o.value)).toEqual(['OptionsToolStripMenuItem','AboutToolStripMenuItem','ToolStripMenuItem1','ToolStripMenuItem2']);
  expect(find('mnuFlanges').checked).toBe(true);expect(find('FlangeTab1').checked).toBe(true);
  expect(find('mnuWallThicknesCalculator').visible).toBe(false);expect(find('mnuFlangeSafePressure').visible).toBe(false);expect(find('mnuPipeSize').visible).toBe(false);
  expect(menu.some(c=>['mnuCheckForUpdates','ToolStripComboBox6','ToolStripButton18','ToolStripButton19'].includes(c.id))).toBe(false);
  expect(find('Combo1_Tab1').text).toBe('Weldneck Flange');
  expect(find('Combo1').text).toBe('Weldneck Flange');
  expect(find('Combo1').options).toHaveLength(7);
  expect(find('Combo1').options[0]).toMatchObject({value:'Combo1_Tab1',text:'Weldneck Flange'});
  expect(find('ToolStripStatusLabel4').text).toBe('Metric Units');
  expect(find('ToolStripStatusLabel3').text).toBe('');
});
test('dialog actions validate selections, preserve source labels, and leave state unchanged until commit',()=>{
  const state=loaded().state,before=structuredClone(state),config=getLegacyDialog('configuration',state);
  expect(config.controls[0].options).toEqual([{value:'Metric',text:'Metric'},{value:'Imperial',text:'U.S. Customary Units'}]);
  expect(dialogWorkAction(config,{Units:'Imperial',ListUnits:'Millimetres',DegUnits:'Fahrenheit',Fractionize:'Yes'})).toEqual({type:'configure',units:'Imperial',listUnits:'Millimetres',temperature:'Fahrenheit',fractions:true});
  expect(()=>dialogWorkAction(config,{Units:'unknown'})).toThrow('Invalid configuration');
  expect(dialogWorkAction(getLegacyDialog('search',state),{query:'flange'})).toEqual({type:'search',query:'flange'});
  expect(()=>getLegacyDialog('flexibility',state,'Length')).toThrow('Dialog is not available');
  const configured=transition(state,{type:'configure',units:'Metric',listUnits:'Millimetres',temperature:'Celsius',fractions:false},catalog).state;
  expect(configured.values.ListUnits).toBe('Millimeters');
  expect(getLegacyDialog('configuration',configured).controls.find(c=>c.id==='ListUnits')?.value).toBe('Millimetres');
  expect(state).toEqual(before);
});
test('menu selection restores a family subtab and delegates actual engineering actions',()=>{
  const first=loaded('Flan3');const other=transition(first.state,{type:'select-route',routeId:'Pipe1'},catalog);
  expect(handleLegacyUiEvent(other.state,'event:FlangeTab1:Click')).toMatchObject({kind:'work',action:{type:'select-route',routeId:'Flan3'}});
  expect(handleLegacyUiEvent(first.state,'event:ToolStripButton4:Click')).toMatchObject({kind:'work',action:{type:'select-route',routeId:'Flan7'}});
  expect(handleLegacyUiEvent(first.state,'event:Combo1_Tab2:Click')).toMatchObject({kind:'work',action:{type:'select-route',routeId:'Flan2'}});
  expect(handleLegacyUiEvent(first.state,'event:Btn2_2:Click')).toMatchObject({kind:'work',action:{type:'select-option',controlId:'ASMEClass',value:'300#'}});
  expect(handleLegacyUiEvent(first.state,'event:ToolStripMenuItem2:Click')).toMatchObject({kind:'work',action:{type:'back'}});
  expect(()=>handleLegacyUiEvent(first.state,'event:fake:Click')).toThrow();
});
test('all source-wired events resolve to explicit engineering, dialog or host effects',()=>{
  const state=loaded().state;
  for(const event of fixture.events){
    const result=handleLegacyUiEvent(state,event.id);
    expect(['work','dialog','none','host','blocked']).toContain(result.kind);
    if(event.action.kind==='empty')expect(result).toEqual({kind:'none'});
    if(event.action.kind==='vendor-link')expect(result.kind).toBe('blocked');
  }
});
test('toolbar guards use recipe counters even when title dropdown has two entries',()=>{
  for(const routeId of ['Fxly1','Fxly2','Span2','Nuts2']){
    const state=loaded(routeId).state;
    expect(state.values.TabbQty).toBe(1);
    for(const id of [1,2,3,4])expect(handleLegacyUiEvent(state,`event:ToolStripButton${id}:Click`)).toEqual({kind:'none'});
  }
  const pipe=loaded('Pipe1').state;
  expect(getLegacyMenu(pipe).find(c=>c.id==='Combo1')?.visible).toBe(false);
});
test('dialogs use the wired flexibility input and preserve the parameter-load override',()=>{
  const state=loaded('Fxly2').state;
  expect(getLegacyDialog('flexibility',state,'Length')).toMatchObject({title:'Distance Between Anchors mm',fieldId:'Length'});
  expect(getLegacyDialog('flexibility',state,'AmbTemp').title).toBe('Ambient Temperature °C');
  expect(getLegacyDialog('configuration',state).title).toBe(' Settings');
  expect(getLegacyDialog('configuration',state).controls.map(c=>c.id)).toEqual(['Units','ListUnits','DegUnits','Fractionize']);
  const span=loaded('Span2').state;
  expect(getLegacyDialog('parameters',span)).toMatchObject({title:'Process Area Span Parameters',documentId:'parameters-metric'});
  expect(getLegacyDocument('parameters-metric',catalog).blocks.join('\n')).toContain("Young's modulus = 20339 MPa");
});
test('documents reject arbitrary assets and contain only inert approved content',()=>{
  const blocks=sanitizeLegacyHtml('<script>alert(1)</script><style>x{}</style><p onclick="bad()">Safe &amp; sound</p><iframe src="https://evil">evil</iframe><a href="javascript:bad()">label</a><img onerror="bad()" src="file:///secret">');
  expect(blocks.join('\n')).toBe('Safe & sound\nlabel');
  for(const id of ['../manifest.json','Gensets/Username.set','system-information','license','__proto__'])expect(()=>getLegacyDocument(id,catalog)).toThrow();
  for(const id of ['about','material','parameters-metric','parameters-imperial','parameters-process-metric','parameters-process-imperial']){
    const doc=getLegacyDocument(id,catalog);expect(doc.blocks.length).toBeGreaterThan(0);
    expect(JSON.stringify(doc)).not.toMatch(/sourceRefs|sourceHash|Zeataline|Pipedata|file:\/\/|<script/i);
  }
  expect(getLegacyDocument('about',catalog).title).toBe('Alfadata');
});
test('search/dispatch mismatch remains independently reconciled',()=>{
  const index=JSON.parse(readFileSync('evidence/route-index.json','utf8'));
  expect(index.searchOnly).toEqual(['Blnd1','Blnd2','Blnd3','Blnd4','Fl6b3']);
  expect(index.dispatchNotInSearch).toEqual(['Comp1','Piwt1','Psiz1']);
});
test('assembly coverage fails when a route or wired event is missing',()=>{
  const index=JSON.parse(readFileSync('evidence/route-index.json','utf8'));
  expect(checkAssemblyCoverage(index,allRoutes,fixture.events.map(e=>e.id))).toEqual([]);
  expect(checkAssemblyCoverage(index,allRoutes.slice(1),fixture.events.slice(1).map(e=>e.id))).toHaveLength(2);
});
