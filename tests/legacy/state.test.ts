import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Catalog, FeatureRoute, LegacyView, WorkState } from '../../src/legacy/contracts';
import { createInitialState } from '../../src/legacy/state/initial';
import { transition, replay } from '../../src/legacy/state/transition';
import { registerRoutes } from '../../src/legacy/registry';
import { applyDefaultSettings, loadSettings, saveSettings } from '../../src/legacy/state/settings';
import { readCell, writeCell, cloneBuffers, readCatalogCell } from '../../src/legacy/state/buffers';
import { unavailableView, sensorUnavailable, recoverLegacyError } from '../../src/legacy/state/errors';
import { searchCatalog } from '../../src/legacy/state/search';
import { encodeWorkState, decodeWorkState, upgradeWorkStateV1 } from '../../src/legacy/state/codec';
import { parseTable } from '../../src/legacy/catalog/parse';
import defaults from '../reference/state/defaults.json';
import search from '../reference/state/search.json';
import { getSharedChecks, applySharedChecks, getSharedOptions } from '../../src/legacy/state/checks';
import { loadTitle } from '../../src/legacy/state/titles';
import continuation from '../reference/state/continuation.json';
import v1 from '../reference/state-codec/special-sparse.json';
import configReference from '../reference/state/configure.json';
import type { WorkAction } from '../../src/legacy/contracts';
const culture = { name: 'en-US', decimalSeparator: '.', groupSeparator: ',' };
const table = parseTable(readFileSync('../Database/Gensets/SearchFile.csv'), 'Gensets/SearchFile.csv');
const catalog: Catalog = { revision: 'source-reference', table: id => {
  if (id === table.id) return table;
  return parseTable(readFileSync(`../Database/${id}`),id);
}, template: () => { throw new Error('Drawing parser is task5'); } };
// Test-only dispatch adapters isolate transition mechanics. They are not route implementations/parity.
const view = (): LegacyView => ({ headers: ['synthetic dispatch probe'], controls: [{ id: 'ASMEClass', sourceId: 'Btn2', type: 'select', text: 'ASME Class', options: [{value:'150#',text:'150#',enabled:true},{value:'400#',text:'400#',enabled:false}], enabled:true,checked:false,visible:true,layout:{x:0,y:0,width:80,height:20},sourceRefs:[] }], drawing: {width:1067,height:690,transform:[1,0,0,1,0,0],commands:[{op:'text',text:'synthetic',x:1,y:2,font:'Verdana',align:'left',color:'red'}]}, messages:[],visibility:{drawing:true} });
function adapter(id: string): FeatureRoute { return {id, apply(state) { return {state,view:view(),trace:[{operation:'test-dispatch',sourceId:id}],evidenceIds:[]}; }}; }
const registry = registerRoutes(['Flan1','Flan2','Flan3','Flan4','Pipe1','Fxly1','Fxly2','Ftsc1','Gpas1','Gpas2','Gpas3','Gpas4','Span1'].map(adapter));
function active(): WorkState { return transition(createInitialState(culture),{type:'select-route',routeId:'Flan1'},catalog,registry).state; }
test('initial state uses source defaults and owns independent mutable banks/settings/history', () => {
  const a=createInitialState(culture), b=createInitialState(culture);
  expect(a.routeId).toBe('Flan1'); expect(a.history).toEqual({ids:['Flan1'],index:0}); expect(a.revision).toBe(0);
  expect(a.values).toMatchObject({MainSize:16,ASMEClass:'300#',Face:'RF',Sch:'STD',AmbTemp:20,DesTemp:100,Length:5000,Units:'Metric',ListUnits:'Inches',DegUnits:'Celsius',Fractionize:'No',ListCol:1,Inchsign:'',WeightFactor:1});
  writeCell(a.legacyBuffers,1,3,4,'changed'); a.history.ids.push('Pipe1'); a.legacySession!.settings.Flan.MainSize=8;
  expect(readCell(b.legacyBuffers,1,3,4)).toBeNull(); expect(b.history.ids).toEqual(['Flan1']); expect(b.legacySession!.settings.Flan.MainSize).toBe(16);
});
describe('independently extracted AddDefaultSettings source branches', () => {
  for (const f of defaults.cases) test(f.id, () => { const s=createInitialState(culture); s.routeId=f.id; s.values={unchanged:'keep'}; applyDefaultSettings(s); expect(s.values).toEqual({unchanged:'keep',...f.expected}); });
});
const adjustments: [string,string,string|number,string|number][] = [
  ['Flan2','ASMEClass','2500#','1500#'],['Flan5','ASMEClass','400#','600#'],['Flan5','ASMEClass','900#','1500#'],['Flan5','ASMEClass','2500#','1500#'],['Flan6','Sch','STD','40s'],['Ftbw11','Sch','STD','10s'],['Ftbw11','Sch','5s','5s'],['Ftsc1','Rating','9000#','6000#'],['Ftsc5','Rating','2000#','3000#'],['Ftsc5','Rating','9000#','6000#'],['Ftsc14','Rating','6000#','3000#'],['Ftsw10','Rating','6000#','3000#'],['Fldi1','DinClass','160','100'],['Fldi3','DinClass','160','160'],['Vlfl7','ASMEClass','2500#','600#'],['Vlfl8','ASMEClass','900#','600#'],['Srra2','ASMEClass','600#','300#'],['Srrb2','ASMEClass','300#','150#']
];
for (const [route,field,input,want] of adjustments) test(`LoadSettings ${route} ${field} ${input}`, () => {
  const s=createInitialState(culture);s.routeId=route;applyDefaultSettings(s);s.values[field]=input;saveSettings(s);loadSettings(s);expect(s.values[field]).toBe(want);
});
test('family settings share across subtabs and stay separate from other families', () => {
  const s=createInitialState(culture);s.values.MainSize=8;saveSettings(s);s.routeId='Pipe1';loadSettings(s);expect(s.values.MainSize).toBe(16);s.routeId='Flan3';loadSettings(s);expect(s.values.MainSize).toBe(8);
  s.routeId='Fldi3';applyDefaultSettings(s);s.values.DinClass='160';s.values.MainSize=6;saveSettings(s);loadSettings(s);expect(s.values.MainSize).toBe(7);
});
test('history is unique, leaves cursor on repeat visits, preserves forward entries and bounds', () => {
  let s=active();
  s=transition(s,{type:'select-route',routeId:'Pipe1'},catalog,registry).state;
  s=transition(s,{type:'select-route',routeId:'Flan1'},catalog,registry).state;
  expect(s.history).toEqual({ids:['Flan1','Pipe1'],index:1});
  s=transition(s,{type:'back'},catalog,registry).state;expect(s.routeId).toBe('Flan1');
  s=transition(s,{type:'back'},catalog,registry).state;expect(s.history.index).toBe(0);
  s=transition(s,{type:'forward'},catalog,registry).state;expect(s.routeId).toBe('Pipe1');
  s=transition(s,{type:'forward'},catalog,registry).state;expect(s.history.index).toBe(1);
});
test('eleventh unique route shifts ten persisted history entries without browser truncation', () => {
  const ids=['Pipe1','Flan2','Flan3','Flan4','Fxly1','Fxly2','Gpas1','Gpas2','Gpas3','Gpas4'];
  const result=replay(active(),ids.map(routeId=>({type:'select-route' as const,routeId})),catalog,registry);
  expect(result.state.history).toEqual({ids,index:9});expect(result.state.revision).toBe(11);
});
test('registry distinguishes stale ids, pending exact dispatch and external ids without fallback', () => {
  expect(registry.classify('Blnd1')).toBe('no-dispatch');expect(registry.classify('Vlfl1')).toBe('pending');expect(registry.classify('flan1')).toBe('unknown');
  expect(() => registerRoutes([adapter('invented')])).toThrow(); expect(() => registerRoutes([adapter('Flan1'),adapter('Flan1')])).toThrow();
  const s=active(), before=structuredClone(s);
  expect(() => transition(s,{type:'select-route',routeId:'Vlfl1'},catalog,registry)).toThrow('Required route implementation pending');
  expect(() => transition(s,{type:'select-route',routeId:'../Flan1'},catalog,registry)).toThrow('Unknown engineering route');expect(s).toEqual(before);
});
test('stale Blnd retains actual previous drawing without guessed catalog/dimensions, even after JSON resume', () => {
  const s=decodeWorkState(JSON.parse(JSON.stringify(encodeWorkState(active()))));
  const r=transition(s,{type:'select-route',routeId:'Blnd1'},catalog,registry);
  expect(r.state.routeId).toBe('Blnd1');expect(r.view.drawing).toEqual(view().drawing);expect(r.view.headers).toEqual(['','','','','','']);expect(r.trace.some(t=>t.operation==='no-dispatch')).toBe(true);expect(r.state.revision).toBe(2);
});
test('dropdown cannot select disabled/hidden/missing control or option and leaves input intact', () => {
  const s=active(), before=structuredClone(s);
  expect(() => transition(s,{type:'select-option',controlId:'ASMEClass',value:'400#'},catalog,registry)).toThrow('Selection is not available');
  expect(() => transition(s,{type:'select-option',controlId:'unknown',value:'150#'},catalog,registry)).toThrow('Selection is not available');
  expect(s).toEqual(before);
  const r=transition(s,{type:'select-option',controlId:'ASMEClass',value:'150#'},catalog,registry);expect(r.state.values.ASMEClass).toBe('150#');expect(r.state.revision).toBe(2);
});
test('source N/A/null/empty sensors yield exact unavailable headers and white-only display separately from errors', () => {
  const s=active();writeCell(s.legacyBuffers,1,16,12,'N/A');expect(sensorUnavailable(s,[{bank:1,row:16,column:12}])).toBe(true);
  const v=unavailableView(view(),'Welding Neck Flange','size-class-face-schedule');
  expect(v.headers).toEqual(['Welding Neck Flange','Not manufactured with the selected parameters','Select another size, class, face type or Schedule','','','','']);
  expect(v.drawing.commands).toEqual([{op:'fillRect',x:-200,y:-200,width:3201,height:2070,color:'#ffffff'}]);expect(s.routeId).toBe('Flan1');
});
test('sparse buffers preserve untouched coordinates and cloning does not share rows', () => {
  const s=active();writeCell(s.legacyBuffers,5,1000,1000,'N/A');const b=cloneBuffers(s.legacyBuffers);writeCell(b,5,1000,1000,'');expect(readCell(s.legacyBuffers,5,1000,1000)).toBe('N/A');expect(Object.keys(b.activeDba[5])).toEqual(['1000']);
  expect(() => writeCell(b,6,0,0,'x')).toThrow();expect(() => readCell(b,1,-1,0)).toThrow();
});
describe('independent Framework search on all shipped rows', () => {
  for(const f of search.cases) test(JSON.stringify(f.query),()=>{if(f.error) expect(()=>searchCatalog(f.query,catalog,culture)).toThrow();else expect(searchCatalog(f.query,catalog,culture)).toEqual(f.hits);});
});
test('search submission is revisioned; ordinary search retains state/drawing and malformed search recovers Flan1', () => {
  const s=transition(active(),{type:'select-route',routeId:'Pipe1'},catalog,registry).state;
  const r=transition(s,{type:'search',query:'elbow'},catalog,registry);expect(r.state.routeId).toBe('Pipe1');expect(r.searchHits?.[0]).toEqual({id:'Ftbw1',text:'Buttwelded 45deg Elbow'});expect(r.state.revision).toBe(s.revision+1);expect(s.values.SearchString).toBeUndefined();
  const error=transition(s,{type:'search',query:'['},catalog,registry);expect(error.state.routeId).toBe('Flan1');expect(error.view.messages.join(' ')).toContain('needs to re-set using the default settings');expect(error.state.revision).toBe(s.revision+1);
});
test('ErrorCatch resets both failing/current family and Flan1 defaults with no preference lookup', () => {
  const s=transition(active(),{type:'select-route',routeId:'Pipe1'},catalog,registry).state;s.values.MainSize=2;
  const r=recoverLegacyError(s,catalog,registry,'Pipe1');expect(r.state.values.MainSize).toBe(16);expect(r.state.legacySession!.settings.Settings.MainSize).toBe(16);expect(r.state.legacySession!.settings.Flan.MainSize).toBe(16);expect(r.view.messages[0]).not.toContain('zeataline');
});
test('new-workspace preferences never change culture or another workspace/reset/resume', () => {
  const p={type:'configure' as const,units:'Imperial' as const,listUnits:'Millimetres' as const,temperature:'Fahrenheit' as const,fractions:true};
  const s=createInitialState(culture,p);expect(s.values).toMatchObject({Units:'Imperial',ListUnits:'Millimeters',DegUnits:'Fahrenheit',Fractionize:'Yes',ListCol:2,Inchsign:'"',WeightFactor:2.2});expect(s.culture).toEqual(culture);
  const r=transition(s,{type:'reset'},catalog,registry);expect(r.state.values.Units).toBe('Imperial');expect(r.state.values.MainSize).toBe(16);expect(createInitialState(culture).values.Units).toBe('Metric');
  expect(decodeWorkState(JSON.parse(JSON.stringify(encodeWorkState(r.state))))).toEqual(r.state);
});
test('empty replay returns retained result without recalculation/revision changes', () => {const s=active();const r=replay(s,[],catalog,registry);expect(r.state).toEqual(s);expect(r.view).toEqual(s.legacySession!.lastView);});
test('AddChecks resets selector eligibility, menu/subtab checks and only first six headers',()=>{
  const s=createInitialState(culture);s.routeId='Flan10';const checks=getSharedChecks(s);
  expect(checks.enabled.ASMEClass).toEqual([true,true,true,true,true,true,true]);expect(checks.enabled.Schedule).toHaveLength(18);expect(checks.checked.FlangeTab1).toBe(true);expect(checks.checked.Combo1_Tab10).toBe(true);expect(checks.checked.mnuValves).toBe(false);
  const v=view();v.headers=['1','2','3','4','5','6','7'];v.controls[0].layout.width=120;v.controls[0].showDropDownArrow=true;
  applySharedChecks(s,v);expect(v.headers).toEqual(['','','','','','','7']);expect(v.controls[0].layout.width).toBe(80);expect(v.controls[0].showDropDownArrow).toBe(false);
});
test('GetTitle preserves exact source title/standard text and stale-title inheritance',()=>{
  const s=createInitialState(culture);loadTitle(s);expect(s.values).toMatchObject({Title:'Weldneck Flange',ActivitySpec:'ASME B16.5',ActivitySpecLong:'ASME B16.5-2020',ActivityTitle:'ASME B16.5 Flanges'});
  s.routeId='Blnd1';loadTitle(s);expect(s.values.Title).toBe('Weldneck Flange');expect(s.values.ActivityTitle).toBe('');
});
test('independent continuation expectations survive JSON persistence without losing special/sparse data',()=>{
  const initial=active();initial.values.AmbTemp=-0;initial.values.DesTemp=NaN;saveSettings(initial);writeCell(initial.legacyBuffers,5,1000,1000,null);
  const first=replay(initial,continuation.actions as WorkAction[],catalog,registry);
  expect(first.state).toMatchObject({routeId:continuation.expected.routeId,history:continuation.expected.history,revision:continuation.expected.revision,values:{MainSize:16,Title:'Pipe'}});expect(first.view.headers).toEqual(continuation.expected.headers);
  const stored=JSON.parse(JSON.stringify(encodeWorkState(first.state))), resumed=decodeWorkState(stored);
  expect(encodeWorkState(first.state).stateSchemaVersion).toBe(2);expect(Object.is(resumed.legacySession!.settings.Flan.AmbTemp,-0)).toBe(true);expect(resumed.legacySession!.settings.Flan.DesTemp).toBeNaN();expect(Object.hasOwn(resumed.legacyBuffers.activeDba[5][1000],1000)).toBe(true);
  const next=replay(resumed,continuation.resumeActions as WorkAction[],catalog,registry);expect(next.state).toMatchObject({routeId:continuation.resumeExpected.routeId,history:continuation.resumeExpected.history,revision:continuation.resumeExpected.revision,values:{Title:continuation.resumeExpected.Title}});
});
test('schema1 remains readable but needs explicit caller-supplied session migration before transitions',()=>{
  const old=decodeWorkState(v1);expect(()=>transition(old,{type:'select-route',routeId:'Pipe1'},catalog,registry)).toThrow('State schema upgrade required');
  const upgraded=upgradeWorkStateV1(v1,{settings:{Settings:{MainSize:16}},lastView:view()});
  expect(Object.is(upgraded.values.negativeZero,-0)).toBe(true);expect(encodeWorkState(upgraded).stateSchemaVersion).toBe(2);expect(v1.stateSchemaVersion).toBe(1);
});
test('schema2 rejects smuggled persisted view fields and envelope/schema mismatch without mutating payload',()=>{
  const encoded=encodeWorkState(active()), copy=structuredClone(encoded);
  (copy as any).stateSchemaVersion=1;expect(()=>decodeWorkState(copy)).toThrow('Invalid private work state');
  const s=active();(s.legacySession!.lastView!.controls[0].layout as any).secret='private-marker';expect(()=>encodeWorkState(s)).toThrow('Invalid private work state');
  expect(encoded).toEqual(encodeWorkState(active()));
});
test('schema2 settings admit only source-proven field names and scalar kinds',()=>{
  const unknown=active();unknown.legacySession!.settings.Flan.unproven='x';expect(()=>encodeWorkState(unknown)).toThrow('Invalid private work state');
  const wrong=active();wrong.legacySession!.settings.Flan.ASMEClass=true;expect(()=>encodeWorkState(wrong)).toThrow('Invalid private work state');
});
test('source cell selection retains raw lexical value and private one-based trace coordinates',()=>{
  const trace:any[]=[];expect(readCatalogCell(catalog,'Pipe/PIPE_Imperial_10.csv',3,4,trace)).toBe('0.065');expect(trace).toEqual([{operation:'read',sourceId:'Pipe/PIPE_Imperial_10.csv',row:3,column:4,value:'0.065'}]);
  expect(()=>readCatalogCell(catalog,'Pipe/PIPE_Imperial_10.csv',0,4,trace)).toThrow();
});
for(const f of configReference.cases)test(`configure retains both shared-family ${f.target} conversions for ${f.input}`,()=>{
  const s=active();s.routeId='Fxly1';loadSettings(s);s.values.AmbTemp=f.input;s.values.DesTemp=f.input;saveSettings(s);s.values.DegUnits=f.target==='Celsius'?'Fahrenheit':'Celsius';
  const r=transition(s,{type:'configure',units:'Metric',listUnits:'Inches',temperature:f.target as 'Celsius'|'Fahrenheit',fractions:false},catalog,registry);expect(r.state.values.AmbTemp).toBe(f.expected);expect(r.state.values.DesTemp).toBe(f.expected);
});
test('unit switches reset shared flexibility lengths exactly and same-unit changes retain them',()=>{
  let s=active();s.routeId='Fxly1';loadSettings(s);s.values.Length=123;saveSettings(s);
  s=transition(s,{type:'configure',units:'Metric',listUnits:'Inches',temperature:'Celsius',fractions:false},catalog,registry).state;expect(s.values.Length).toBe(123);
  s=transition(s,{type:'configure',units:'Imperial',listUnits:'Inches',temperature:'Celsius',fractions:false},catalog,registry).state;expect(s.values.Length).toBe(4000);
  s=transition(s,{type:'configure',units:'Metric',listUnits:'Inches',temperature:'Celsius',fractions:false},catalog,registry).state;expect(s.values.Length).toBe(100000);
});
test('shared option order and API unit labels follow the source independently of nominal-list units',()=>{
  const s=createInitialState(culture), options=getSharedOptions(s);expect(options.ASMEClass.map(o=>o.text)).toEqual(['150#','300#','400#','600#','900#','1500#','2500#']);expect(options.DinClass.map(o=>o.text)).toEqual(['2.5','6','10','25','40','63','100','160','250','320','400']);expect(options.APIRatingIndex[3]).toEqual({value:'4',text:'69.0 MPa',enabled:true});
  s.values.Units='Imperial';expect(getSharedOptions(s).APIRatingIndex[3].text).toBe('10000 PSI');options.ASMEClass[0].enabled=false;expect(getSharedOptions(s).ASMEClass[0].enabled).toBe(true);
});
test('route-local ErrorCatch crosses the transition boundary with a fresh state and one revision',()=>{
  const routes=registerRoutes([adapter('Flan1'),{id:'Pipe1',apply(s,a,c){return recoverLegacyError(s,c,routes,'Pipe1');}}]);
  const initial=active(), before=structuredClone(initial), result=transition(initial,{type:'select-route',routeId:'Pipe1'},catalog,routes);
  expect(result.state.routeId).toBe('Flan1');expect(result.state.revision).toBe(initial.revision+1);expect(result.state.values.MainSize).toBe(16);expect(result.view.messages[0]).toContain('needs to re-set');expect(result.trace.some(t=>t.operation==='ErrorCatch')).toBe(true);expect(initial).toEqual(before);
});
test('source-supported Vlfl actuator choice persists and reloads within its family',()=>{
  const routes=registerRoutes([adapter('Flan1'),{id:'Vlfl7',apply(state){const v=view();v.controls=[{...v.controls[0],id:'Actuator',sourceId:'Btn3',text:'Actuator',options:[{value:'Lever',text:'Lever',enabled:true},{value:'Handwheel',text:'Handwheel',enabled:true}]}];return {state,view:v,trace:[],evidenceIds:[]};}}]);
  const initial=transition(active(),{type:'select-route',routeId:'Vlfl7'},catalog,routes).state;
  const result=transition(initial,{type:'select-option',controlId:'Actuator',value:'Handwheel'},catalog,routes);
  expect(result.state.values.Actuator).toBe('Handwheel');expect(result.state.legacySession!.settings.Vlfl.Actuator).toBe('Handwheel');
  const restored=decodeWorkState(JSON.parse(JSON.stringify(encodeWorkState(result.state))));expect(transition(restored,{type:'select-route',routeId:'Vlfl7'},catalog,routes).state.values.Actuator).toBe('Handwheel');expect(initial.values.Actuator).toBe('Lever');
});
test('source unavailable state carries explicit empty text results and strict private result rows',()=>{
  const v=unavailableView(view(),'Weldneck Flange','size-class-face-schedule');expect(v.textResults).toEqual({status:'unavailable',rows:[]});
  const s=active();s.legacySession!.lastView=v;expect(decodeWorkState(JSON.parse(JSON.stringify(encodeWorkState(s)))).legacySession!.lastView!.textResults).toEqual({status:'unavailable',rows:[]});
  v.textResults={status:'available',rows:[{id:'header2',label:'Flange Wt =  ',value:'reference-only',unit:'kg'}]};expect(()=>encodeWorkState(s)).not.toThrow();
  (v.textResults.rows[0] as any).rawBank='private-marker';expect(()=>encodeWorkState(s)).toThrow('Invalid private work state');
});
