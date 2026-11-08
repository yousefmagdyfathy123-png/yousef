import { expect,test,vi } from 'vitest';
import { resolve } from 'node:path';
import { valveRoutes } from '../../src/legacy/features/valves';
import { strainerRoutes } from '../../src/legacy/features/strainers';
import { fastenerRoutes } from '../../src/legacy/features/fasteners';
import { flangeRoutes } from '../../src/legacy/features/flanges';
import { registerRoutes } from '../../src/legacy/registry';
import { loadCatalog } from '../../src/server/catalog';
import { createInitialState } from '../../src/legacy/state/initial';
import { loadSettings,saveSettings } from '../../src/legacy/state/settings';
import { transition } from '../../src/legacy/state/transition';
import { encodeWorkState,decodeWorkState } from '../../src/legacy/state/codec';
import { configureState } from '../../src/legacy/state/configure';
import type { Catalog } from '../../src/legacy/contracts';
vi.mock('server-only',()=>({}));
const routes=[...valveRoutes,...strainerRoutes,...fastenerRoutes],registry=registerRoutes([...flangeRoutes,...routes]);
const culture={name:'en-US',decimalSeparator:'.',groupSeparator:','};
const catalog=await loadCatalog(resolve('private/catalog'));
function initial(routeId:string,values:Record<string,string|number>={}){
  const state=createInitialState(culture);state.routeId=routeId;loadSettings(state);
  configureState(state,{type:'configure',units:values.Units==='Imperial'?'Imperial':'Metric',listUnits:'Inches',temperature:'Celsius',fractions:false},catalog);
  Object.assign(state.values,values);saveSettings(state);return state;
}
test.each(routes)('$id survives serialization and keeps prior bank4 and caller state',route=>{
  const start=transition(createInitialState(culture),{type:'select-route',routeId:'Flan1'},catalog,registry).state,before=structuredClone(start);
  const restored=decodeWorkState(JSON.parse(JSON.stringify(encodeWorkState(start)))),action={type:'select-route' as const,routeId:route.id};
  const result=transition(start,action,catalog,registry);
  expect(transition(restored,action,catalog,registry)).toEqual(result);
  expect(result.state.routeId).toBe(route.id);expect(result.state.legacyBuffers.activeDba[4]).toEqual(start.legacyBuffers.activeDba[4]);
  expect(start).toEqual(before);
});
test.each(routes)('$id recovers a source table failure and hides internal exception detail',route=>{
  const broken:Catalog={revision:catalog.revision,table(id){if(!id.startsWith('Flan/')&&!id.startsWith('Pipe/'))throw new Error('PRIVATE TABLE PATH');return catalog.table(id);},template:id=>catalog.template(id)};
  const result=transition(createInitialState(culture),{type:'select-route',routeId:route.id},broken,registry);
  expect(result.state.routeId).toBe('Flan1');expect(result.view.messages[0]).toContain('encountered a problem at '+route.id);
  expect(JSON.stringify(result.view)).not.toContain('PRIVATE');
});
test.each(valveRoutes.filter(r=>r.id.startsWith('Vlfl')))('$id refuses class400 through normal controls',route=>{
  const result=transition(initial(route.id),{type:'select-route',routeId:route.id},catalog,registry);
  expect(result.view.controls.find(c=>c.id==='ASMEClass')!.options.find(o=>o.value==='400#')!.enabled).toBe(false);
  expect(()=>transition(result.state,{type:'select-option',controlId:'ASMEClass',value:'400#'},catalog,registry)).toThrow('Selection is not available');
});
test.each(['Vlfl1','Vlfl2','Vlfl3','Vlfl4','Vlfl5','Vlfl6'])('%s persisted400 uses an existing table and the exact unavailable flow',routeId=>{
  const result=transition(initial(routeId,{ASMEClass:'400#'}),{type:'select-route',routeId},catalog,registry);
  expect(result.state.routeId).toBe(routeId);expect(result.state.values.ASMEClass).toBe('400#');
  expect(result.view.headers.slice(1,3)).toEqual(['Not manufactured with the selected parameters','Try another size, class or face type']);
  expect(result.view.drawing.commands).toEqual([{op:'fillRect',x:-200,y:-200,width:3201,height:2070,color:'#ffffff'}]);
});
test.each(['Vlfl7','Vlfl8'])('%s missing persisted400 file takes exception recovery',routeId=>{
  const result=transition(initial(routeId,{ASMEClass:'400#'}),{type:'select-route',routeId},catalog,registry);
  expect(result.state.routeId).toBe('Flan1');expect(result.view.messages[0]).toContain('encountered a problem at '+routeId);
});
test('Imperial Vlfl4 class400 has no source file, distinct from Metric unavailable data',()=>{
  const result=transition(initial('Vlfl4',{ASMEClass:'400#',Units:'Imperial'}),{type:'select-route',routeId:'Vlfl4'},catalog,registry);
  expect(result.state.routeId).toBe('Flan1');expect(result.view.messages[0]).toContain('at Vlfl4');
});
test('Metric butterfly150 uses Vlv8150 and never the malformed extra underscore file',()=>{
  const result=transition(initial('Vlfl8',{ASMEClass:'150#',MainSize:4}),{type:'select-route',routeId:'Vlfl8'},catalog,registry);
  expect(result.trace.filter(t=>t.operation==='load-bank').map(t=>t.sourceId)).toEqual(['Vlfl/Vlv8150.csv']);
  expect(result.view.textResults!.status).toBe('available');
});
test('search-only Srrb3 inherits the preceding source title',()=>{
  const flange=transition(createInitialState(culture),{type:'select-route',routeId:'Flan1'},catalog,registry);
  const basket=transition(flange.state,{type:'select-route',routeId:'Srrb3'},catalog,registry);
  // Source Srrb3_150 has nine rows; row16 clamps to row9 (12-inch).
  expect(basket.view.headers[0]).toBe('12"NPS Weldneck Flange 150#');
  expect(basket.state.values.Title).toBe('Weldneck Flange');
});
test('nuts retain the preceding recipe weight factor until configuration reload',()=>{
  const valve=transition(initial('Vlfl1',{Units:'Imperial'}),{type:'select-route',routeId:'Vlfl1'},catalog,registry);
  const nut=transition(valve.state,{type:'select-route',routeId:'Nuts1'},catalog,registry);
  expect(nut.state.values.WeightFactor).toBe(2.20462);
  // Nuts1.csv row16 col9 is57; source scales by0.01 after WeightFactor.
  expect(nut.view.headers[1]).toBe('Weight = 1.26lb');
  const configured=transition(nut.state,{type:'configure',units:'Imperial',listUnits:'Inches',temperature:'Celsius',fractions:false},catalog,registry);
  expect(configured.state.values.WeightFactor).toBe(2.2);
  expect(configured.view.headers[1]).toBe('Weight = 1.25lb');
});
test.each(['Vlfl1','Vlfl2','Vlfl3'])('%s retains all source subtab scratch fields',routeId=>{
  const result=transition(initial(routeId),{type:'select-route',routeId},catalog,registry);
  expect(result.state.values.SubSubTab).toBe(routeId+(routeId==='Vlfl1'?'a':'b'));
  expect(result.state.values.SubSubSubTab).toBe(routeId+'c');
});
test('Vlfl1 uses the source implicit numeric conversion for weight',()=>{
  const broken:Catalog={revision:catalog.revision,table(id){
    const table=catalog.table(id);if(id.toLowerCase()!=='vlfl/vlv1300.csv')return table;
    const rows=table.rows.map(r=>[...r]);rows[15][10]='N/A';return {...table,rows};
  },template:id=>catalog.template(id)};
  const result=transition(initial('Vlfl1'),{type:'select-route',routeId:'Vlfl1'},broken,registry);
  expect(result.state.routeId).toBe('Flan1');expect(result.view.messages[0]).toContain('at Vlfl1');
});
test('a drawing-read exception identifies the selected source subtab',()=>{
  const broken:Catalog={revision:catalog.revision,table:id=>catalog.table(id),template(id){
    if(id==='Vlfl/Vlfl1c.dxf')throw new Error('PRIVATE SUBTAB');return catalog.template(id);
  }};
  const result=transition(initial('Vlfl1',{Face:'RTJ'}),{type:'select-route',routeId:'Vlfl1'},broken,registry);
  expect(result.state.routeId).toBe('Flan1');expect(result.view.messages[0]).toContain('at Vlfl1c');
  expect(JSON.stringify(result.view)).not.toContain('PRIVATE');
});
test('the empty ErrorMessageNuts handler retains the preceding drawing and seventh heading',()=>{
  const start=transition(createInitialState(culture),{type:'select-route',routeId:'Flan1'},catalog,registry);
  const broken:Catalog={revision:catalog.revision,table(id){
    const table=catalog.table(id);if(id!=='Nuts/Nuts1.csv')return table;
    return {...table,rows:table.rows.map((r,i)=>i<2?r:r.map((x,j)=>j===2?'N/A':x))};
  },template:id=>catalog.template(id)};
  const result=transition(start.state,{type:'select-route',routeId:'Nuts1'},broken,registry);
  expect(result.state.routeId).toBe('Nuts1');expect(result.view.messages).toEqual([]);
  expect(result.view.headers).toEqual(['','','','','','',start.view.headers[6]]);
  expect(result.view.drawing).toEqual(start.view.drawing);
});
test('saved material does not select a different Task8 valve drawing',()=>{
  const a=transition(initial('Vlfl1',{Material:'Carbon Steel'}),{type:'select-route',routeId:'Vlfl1'},catalog,registry);
  const b=transition(initial('Vlfl1',{Material:'Stainless Steel'}),{type:'select-route',routeId:'Vlfl1'},catalog,registry);
  expect(b.view).toEqual(a.view);
});
test('Blnu2 clamping reentry repeats the source Indicator Hole suffix',()=>{
  const result=transition(initial('Blnu2',{ASMEClass:'150#',Face:'RTJ',MainSize:100}),{type:'select-route',routeId:'Blnu2'},catalog,registry);
  expect(result.state.values.MainSize).toBe(21);
  expect(result.state.legacyBuffers.activeDba[1][21][10]).toBe('12 Indicator Hole Indicator Hole');
  expect(result.view.drawing.commands.some(c=>c.op==='text'&&c.text==='12 Indicator Hole Indicator Hole')).toBe(true);
});
