import { createHash } from 'node:crypto';
import { markerFor,markerText } from '../../src/legacy/drawing/markers';
import { resultsText } from '../../src/workspace/ResultsPanel';
import { toPublicWorkResult } from '../../src/server/engineering/public-result';
import { validateLegacyView } from '../../src/legacy/state/view-schema';
import { expect,test,vi } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { calculatorRoutes } from '../../src/legacy/features/calculators';
import { applyLegacyInput } from '../../src/legacy/state/inputs';
import { createInitialState } from '../../src/legacy/state/initial';
import { applyDefaultSettings,saveSettings } from '../../src/legacy/state/settings';
import { loadTitle } from '../../src/legacy/state/titles';
import { registerRoutes } from '../../src/legacy/registry';
import { transition } from '../../src/legacy/state/transition';
import { flangeRoutes } from '../../src/legacy/features/flanges';
import { loadCatalog } from '../../src/server/catalog';
import { loadConfig } from '../../src/legacy/state/configure';
import type { Catalog,WorkState } from '../../src/legacy/contracts';
import { encodeWorkState,decodeWorkState } from '../../src/legacy/state/codec';
import { vbSingleString } from '../../src/legacy/vb/strings';
import { vbVal } from '../../src/legacy/vb/numbers';
vi.mock('server-only',()=>({}));
const culture={name:'en-US',decimalSeparator:'.',groupSeparator:','};
const catalog=await loadCatalog(resolve('private/catalog'));
const registry=registerRoutes([...flangeRoutes,...calculatorRoutes]);
function state(routeId:string){const s=createInitialState(culture);s.routeId=routeId;applyDefaultSettings(s);loadTitle(s);saveSettings(s);return s;}
test.each(['Gpas1','Gpas2','Gpas3','Gpas4','Comp1','Span1','Span2','Fxly1','Fxly2','Psiz1'])('%s renders its own result without error recovery',id=>{
  const r=transition(state(id),{type:'select-route',routeId:id},catalog,registry);
  expect(r.state.routeId).toBe(id);expect(r.view.messages).toEqual([]);expect(r.view.drawing.commands.length).toBeGreaterThan(5);
});
test('all ten calculator dispatch routes are implemented',()=>{
  expect(calculatorRoutes.map(r=>r.id).sort()).toEqual(['Gpas1','Gpas2','Gpas3','Gpas4','Comp1','Span1','Span2','Fxly1','Fxly2','Psiz1'].sort());
  expect(registry.classify('Pwal1')).toBe('no-dispatch');expect(registry.classify('Ptem1')).toBe('no-dispatch');
});
test('Gpas3 preserves string comparison: NPS1¼/1 class150 selects99.2 over101.1',()=>{
  const s=state('Gpas3');Object.assign(s.values,{MainSize:8,SmallSize:7});saveSettings(s);
  const r=transition(s,{type:'select-route',routeId:s.routeId},catalog,registry);
  expect(r.state.values.Ans1).toBe('99.2');expect(r.state.values.Ans2).toBe('101.1');expect(r.state.values.Ans3).toBe('99');
});
test('wired flexibility dialog floors negative temperatures and accepts Imperial10',()=>{
  const s=state('Fxly1');expect(applyLegacyInput(s,'AmbTemp','-0.1').state.values.AmbTemp).toBe(-1);
  s.values.Units='Imperial';const r=applyLegacyInput(s,'Length','10');expect(r.ok).toBe(true);expect(r.state.values.Length).toBe(10);
});
test('flexibility displays Single length with Framework G7 precision',()=>{
  const first=transition(state('Fxly1'),{type:'select-route',routeId:'Fxly1'},catalog,registry);
  const r=transition(first.state,{type:'input',fieldId:'Length',raw:'12345.67'},catalog,registry);
  expect(r.state.legacyBuffers.activeDba[1][Number(r.state.values.MainSize)][14]).toBe('12345.67');
});
test('Clicker reloads Single settings through the source registry G7 string',()=>{
  const first=transition(state('Fxly1'),{type:'select-route',routeId:'Fxly1'},catalog,registry);
  const r=transition(first.state,{type:'input',fieldId:'Length',raw:'1234.56789'},catalog,registry);
  expect(r.state.values.Length).toBe(Math.fround(1234.568));
  const nan=transition(r.state,{type:'input',fieldId:'AmbTemp',raw:'NaN'},catalog,registry);
  expect(nan.state.values.AmbTemp).toBe(0);
});
test('failed temperature conversion retains source assignment but does not save it',()=>{
  const s=state('Fxly1'),before=structuredClone(s.legacySession!.settings);
  const r=applyLegacyInput(s,'AmbTemp','401');expect(r.ok).toBe(false);if(!r.ok)expect(r.messages).toEqual([]);
  expect(r.state.values.AmbTemp).toBe(401);expect(r.state.legacySession!.settings).toEqual(before);expect(s.values.AmbTemp).toBe(86);
});
test('rejects fields with no wired dialog',()=>{expect(()=>applyLegacyInput(state('Psiz1'),'Flowrate','10')).toThrow('Input is not available');});
test('Medium Oil retains prior Water coefficients; a fresh Oil selection has source null coefficients',()=>{
  const water=transition(state('Psiz1'),{type:'select-route',routeId:'Psiz1'},catalog,registry);
  const oil=transition(water.state,{type:'select-option',controlId:'Fluid',value:'Medium Oil'},catalog,registry);
  expect(oil.state.values.PsizDensity).toBe(1);expect(oil.state.values.PsizViscosity).toBe(1);expect(oil.view.headers).toEqual(water.view.headers);
  const fresh=state('Psiz1');fresh.values.Fluid='Medium Oil';saveSettings(fresh);
  const r=transition(fresh,{type:'select-route',routeId:'Psiz1'},catalog,registry);
  expect(r.state.values.PsizVelocity).toBe(Infinity);expect(r.view.headers[1]).toBe('Optimum Velocity 0 mtrs/sec');
});
test('failed linked input preserves the displayed result; correction saves and rerenders',()=>{
  const first=transition(state('Fxly1'),{type:'select-route',routeId:'Fxly1'},catalog,registry);
  const failed=transition(first.state,{type:'input',fieldId:'Length',raw:'499'},catalog,registry);
  expect(failed.view.headers).toEqual(first.view.headers);expect(failed.view.drawing).toEqual(first.view.drawing);
  expect(failed.view.messages).toEqual(['Please enter a numerical value between 500 and 100000 mm']);
  expect(failed.state.values.Length).toBe(499);expect(failed.state.legacySession!.settings.Fxly.Length).toBe(2000);
  const good=transition(failed.state,{type:'input',fieldId:'Length',raw:'5000'},catalog,registry);
  expect(good.state.values.Length).toBe(5000);expect(good.state.legacySession!.settings.Fxly.Length).toBe(5000);expect(good.view.messages).toEqual([]);
  expect(good.view.drawing).not.toEqual(first.view.drawing);
});
test('failed nonfinite input survives persistence and can be corrected',()=>{
  const first=transition(state('Fxly2'),{type:'select-route',routeId:'Fxly2'},catalog,registry);
  const failed=transition(first.state,{type:'input',fieldId:'AmbTemp',raw:'1e40'},catalog,registry);
  expect(failed.state.values.AmbTemp).toBe(Infinity);expect(failed.view.drawing).toEqual(first.view.drawing);
  const saved=decodeWorkState(encodeWorkState(failed.state));expect(saved.values.AmbTemp).toBe(Infinity);
  expect(transition(saved,{type:'input',fieldId:'AmbTemp',raw:'20'},catalog,registry)).toEqual(transition(failed.state,{type:'input',fieldId:'AmbTemp',raw:'20'},catalog,registry));
});
test('cooling drawing failures retain the selected source subtab error identity',()=>{
  const s=state('Fxly1');Object.assign(s.values,{AmbTemp:100,DesTemp:20});saveSettings(s);
  const fault:Catalog={revision:catalog.revision,table:catalog.table.bind(catalog),template(path){if(path==='Fxly/Fxly1a.dxf')throw new Error('Missing source drawing');return catalog.template(path);}};
  const r=transition(s,{type:'select-route',routeId:s.routeId},fault,registry);
  expect(r.state.routeId).toBe('Flan1');expect(r.trace.find(t=>t.operation==='ErrorCatch')?.sourceId).toBe('Fxly1a');
});
for(const id of ['Ptem1','Pwal1'])test(id+' keeps prior drawing through no-dispatch',()=>{
  const old=transition(state('Flan1'),{type:'select-route',routeId:'Flan1'},catalog,registry);
  const r=transition(old.state,{type:'select-route',routeId:id},catalog,registry);
  expect(r.view.drawing).toEqual(old.view.drawing);expect(r.trace.some(t=>t.operation==='no-dispatch')).toBe(true);
});
const framework=JSON.parse(readFileSync('tests/reference/calculators/framework.json','utf8'));
for(const c of framework.cases)test(c.id+' matches isolated .NET4 '+c.kind,()=>{
  const args=c.args;
  if(c.kind==='single-string'){
    const text=vbSingleString(Number(args.value),culture);expect(text).toBe(c.expected.text);expect(Math.fround(vbVal(text))).toBe(c.expected.reloaded);return;
  }
  if(c.kind==='input'){
    const s=state(args.field==='DistanceBetweenAnchors'?'Fxly2':'Fxly1');Object.assign(s.values,{Units:args.Units,DegUnits:args.DegUnits});
    const key:Record<string,string>={'Ambient Temperature':'AmbTemp','Design Temperature':'DesTemp',DistanceToAnchor:'Length',DistanceBetweenAnchors:'Length'};
    const r=applyLegacyInput(s,key[args.field],args.raw);expect(r.ok).toBe(c.expected.ok);if(!r.ok)expect(r.messages).toEqual(c.expected.messages);
    for(const k of ['AmbTemp','DesTemp','Length'])expect(r.state.values[k]).toBe(Number(c.expected[k]));return;
  }
  const id=args.route??(c.kind==='span'?'Span1':'Psiz1'),s=state(id);Object.assign(s.values,{MainSize:8,SmallSize:7,InsThkIndex:2,InsThk2Index:3,Units:args.units??args.Units??'Metric',...args});loadConfig(s);
  if(c.kind==='flexibility')s.values.TempSign=args.TempSign;
  const altered:Catalog={revision:catalog.revision,template:catalog.template.bind(catalog),table(path){
    const t=catalog.table(path),rows=t.rows.map(r=>[...r]);
    if(c.kind==='spacing'){
      const d=args.diameters;if(path==='Pipe/PipeSTD.csv'){rows[7][2]=String(d[0]);rows[6][2]=String(d[1]);}
      if(path.startsWith('Flom/Flg')){rows[7][2]=String(d[2]);rows[6][2]=String(d[3]);}
    }else if(c.kind==='span'||c.kind==='flexibility'){if(path==='Pipe/PipeSTD.csv'){rows[7][2]=args.od;if(c.kind==='span')rows[7][3]=args.wall;}}
    return {...t,rows};
  }};
  const r=registry.get(id)!.apply(s,{type:'select-route',routeId:id},altered);expect(r.state.routeId).toBe(id);
  for(const [key,expected] of Object.entries(c.expected)){
    const actual=r.state.values[key];
    if(typeof expected==='number')expect(Number(actual),key).toBeCloseTo(expected,9);
    else if(typeof expected==='string'&&!Number.isNaN(Number(expected))&&Number.isFinite(Number(expected)))expect(Number(actual),key).toBeCloseTo(Number(expected),9);
    else expect(String(actual),key).toBe(expected);
  }
});

// These fingerprints and Ans strings were captured before the presentation-only change.
const guideCases=[
  ['Metric','Celsius',20,100,2000,'1639','1639.20952718551','1.92','ff983c5c08d6611b7d238126d4a4f455d654f0450c15c8604f75d438acfae672'],
  ['Imperial','Celsius',20,100,80,'65','65.0500458340878','0.0768000024510181','543d5d4531585de01b57abdba1a430be1728b85571d9c1e24ca53f10315a2330'],
  ['Metric','Fahrenheit',68,212,2000,'1639','1639.20952718551','1.92','ff983c5c08d6611b7d238126d4a4f455d654f0450c15c8604f75d438acfae672'],
  ['Imperial','Fahrenheit',68,212,80,'65','65.0500458340878','0.0768000024510181','543d5d4531585de01b57abdba1a430be1728b85571d9c1e24ca53f10315a2330'],
  ['Metric','Celsius',20,100,5000,'2591','2591.81783407696','4.8','eee5bce6249bfae83e4b113a81be9aa7b795ff36ff2736e27e0f67b0c337da22'],
  ['Metric','Celsius',100,20,2000,'1639','1639.20952718551','1.92','1d42e87eaf818362ae285974ca06c7e2ce18e857c4c7c5d366e46889411d1232'],
] as const;
test.each(guideCases)('guide output matches drawing buffer without changing engineering: %s %s %s %s %s',(Units,DegUnits,AmbTemp,DesTemp,Length,value,ans1,ans2,hash)=>{
  const s=state('Fxly1');Object.assign(s.values,{Units,DegUnits,AmbTemp,DesTemp,Length});saveSettings(s);loadConfig(s);
  const r=transition(s,{type:'select-route',routeId:'Fxly1'},catalog,registry);
  expect(r.state.values.Ans1).toBe(ans1);expect(r.state.values.Ans2).toBe(ans2);
  expect(createHash('sha256').update(JSON.stringify(r.view.drawing)).digest('hex')).toBe(hash);
  expect(r.state.legacyBuffers.activeDba[1][Number(r.state.values.MainSize)][16]).toBe(value);
  const template=catalog.template('Fxly/'+(DesTemp<AmbTemp?'Fxly1a':'Fxly1')+'.dxf');
  const markers=template.records.filter(record=>markerFor(record)?.column===16&&markerFor(record)?.bank===1);
  expect(markers.length).toBeGreaterThan(0);
  for(const marker of markers)expect(r.view.drawing.commands.some(cmd=>cmd.op==='text'&&cmd.text===markerText(r.state,marker))).toBe(true);
  const unit=Units==='Imperial'?'in':'mm';
  expect(r.view.textResults?.rows).toEqual([
    {id:'ambient',label:'Ambient Temp:',value:String(AmbTemp),unit:DegUnits==='Celsius'?'°C':'°F',kind:'input'},
    {id:'design',label:'Design Temp:',value:String(DesTemp),unit:DegUnits==='Celsius'?'°C':'°F',kind:'input'},
    {id:'guide-distance',label:'Required distance to first guide',value,unit,kind:'output'},
  ]);
  expect(()=>validateLegacyView(r.view)).not.toThrow();
  const dto=toPublicWorkResult('guide-test',r);
  expect(resultsText(dto.view.textResults)).toContain('Required distance to first guide\t'+value+'\t'+unit);
  expect(decodeWorkState(encodeWorkState(r.state)).legacySession?.lastView?.textResults).toEqual(r.view.textResults);
});
test('unavailable flexibility size clears a previously valid guide output',()=>{
  const first=transition(state('Fxly1'),{type:'select-route',routeId:'Fxly1'},catalog,registry);
  expect(first.view.textResults?.rows.some(r=>r.id==='guide-distance')).toBe(true);
  const missing:Catalog={revision:catalog.revision,template:catalog.template.bind(catalog),table(path){
    const table=catalog.table(path);return path==='Pipe/PipeSTD.csv'?{...table,rows:table.rows.map(row=>row.map((v,i)=>i===3?'N/A':v))}:table;
  }};
  const r=transition(first.state,{type:'select-option',controlId:'MainSize',value:'3'},missing,registry);
  expect(r.view.textResults).toEqual({status:'unavailable',rows:[]});
  expect(resultsText(toPublicWorkResult('guide-test',r).view.textResults)).not.toContain('Required distance');
});
