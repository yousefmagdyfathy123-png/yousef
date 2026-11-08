import { flangeRoutes } from '../../src/legacy/features/flanges';
import { expect,test,vi } from 'vitest';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { loadCatalog } from '../../src/server/catalog';
import { createInitialState } from '../../src/legacy/state/initial';
import { configureState } from '../../src/legacy/state/configure';
import { saveSettings,loadSettings,settingsKey } from '../../src/legacy/state/settings';
import { transition } from '../../src/legacy/state/transition';
import { registerRoutes } from '../../src/legacy/registry';
import { Flan1 } from '../../src/legacy/features/flanges/flan/Flan1';
import { Flan2 } from '../../src/legacy/features/flanges/flan/Flan2';
import { Flan3 } from '../../src/legacy/features/flanges/flan/Flan3';
import { Flan4 } from '../../src/legacy/features/flanges/flan/Flan4';
import { Flan5 } from '../../src/legacy/features/flanges/flan/Flan5';
import { Flan6 } from '../../src/legacy/features/flanges/flan/Flan6';
import { Flan7 } from '../../src/legacy/features/flanges/flan/Flan7';
import { Flaa2 } from '../../src/legacy/features/flanges/flaa/Flaa2';
import { Flap2 } from '../../src/legacy/features/flanges/flap/Flap2';
import { Orif3 } from '../../src/legacy/features/flanges/orif/Orif3';
import { Flre2 } from '../../src/legacy/features/flanges/flre/Flre2';
import { Flco2 } from '../../src/legacy/features/flanges/flco/Flco2';
import { Flco3 } from '../../src/legacy/features/flanges/flco/Flco3';
import { Fl6b2 } from '../../src/legacy/features/flanges/fl6b/Fl6b2';
import { Flbx2 } from '../../src/legacy/features/flanges/flbx/Flbx2';
import { Fldi2 } from '../../src/legacy/features/flanges/fldi/Fldi2';
import { Fldi3 } from '../../src/legacy/features/flanges/fldi/Fldi3';
import { Fldi4 } from '../../src/legacy/features/flanges/fldi/Fldi4';
import { Fldi5 } from '../../src/legacy/features/flanges/fldi/Fldi5';
import { Flhb1 } from '../../src/legacy/features/flanges/flhb/Flhb1';
import { Flbs1 } from '../../src/legacy/features/flanges/flbs/Flbs1';
import { Fldi1 } from '../../src/legacy/features/flanges/fldi/Fldi1';
import { Flbx1 } from '../../src/legacy/features/flanges/flbx/Flbx1';
import { Fl6b1 } from '../../src/legacy/features/flanges/fl6b/Fl6b1';
import { Flco1 } from '../../src/legacy/features/flanges/flco/Flco1';
import { Flre1 } from '../../src/legacy/features/flanges/flre/Flre1';
import { Orif2 } from '../../src/legacy/features/flanges/orif/Orif2';
import { Orif1 } from '../../src/legacy/features/flanges/orif/Orif1';
import { Flap1 } from '../../src/legacy/features/flanges/flap/Flap1';
import { Flaa1 } from '../../src/legacy/features/flanges/flaa/Flaa1';
import { normalizeView } from '../reference/normalize';
import { assertReferenceFixture } from '../reference/schema';
import { loadFlangeCases } from '../reference/flange-cases';
import type { Catalog } from '../../src/legacy/contracts';
vi.mock('server-only',()=>({}));
const culture={name:'en-US',decimalSeparator:'.',groupSeparator:','};
const catalog=await loadCatalog(resolve('private/catalog'));
const routes=flangeRoutes;
const refs={cases:loadFlangeCases('Flan1')};
const cases=routes.flatMap(route=>route.id==='Flan1'?refs.cases:loadFlangeCases(route.id));
for(const c of cases)test(c.id+' matches independent source references',()=>{
  assertReferenceFixture(c);const state=createInitialState(culture),initial=c.initial as Record<string,string|number>;state.routeId=c.actions[0].routeId;loadSettings(state);
  configureState(state,{type:'configure',units:initial.Units==='Imperial'?'Imperial':'Metric',listUnits:initial.ListUnits==='Millimetres'?'Millimetres':'Inches',temperature:'Celsius',fractions:initial.Fractionize==='Yes'});
  Object.assign(state.values,initial);saveSettings(state);
  const result=transition(state,{type:'select-route',routeId:c.actions[0].routeId},catalog,registerRoutes(routes));
  const actual=normalizeView(result);
  expect(actual.view).toEqual(c.expected.view);
  // WhiteBlock and DoDrawing both update source Factor for this1067x690 viewport.
  expect(actual.state.legacyBuffers.drawing?.factor).toBe(1);
  expect(actual.state.values.MainSize).toBe(c.expected.mainSize);
  if(c.expected.sourceValues)for(const [key,value] of Object.entries(c.expected.sourceValues))expect(actual.state.values[key],key).toBe(value);
  if(c.expected.savedValues)for(const [key,value] of Object.entries(c.expected.savedValues))expect(actual.state.legacySession!.settings[settingsKey(state.routeId)][key],'saved '+key).toBe(value);
  expect(c.expected.lineCounts.map((_,i)=>actual.state.values['LineQtyDbase'+(i+1)])).toEqual(c.expected.lineCounts);
  expect(actual.trace.filter(t=>t.operation==='load-bank').map(t=>t.sourceId)).toEqual(c.expected.files);
  const banks=actual.state.legacyBuffers.activeDba;
  const tuples=Object.entries(banks).flatMap(([b,rows])=>Object.entries(rows).flatMap(([r,cells])=>Object.entries(cells).map(([col,value])=>[Number(b),Number(r),Number(col),value])));
  expect(createHash('sha256').update(JSON.stringify(tuples)).digest('hex')).toBe(c.expected.bankFingerprint);
});
test.each(['Flan2','Flan3','Flan4','Flan5','Flan6','Flan7','Flaa1','Flaa2','Flap1','Flap2','Orif1','Orif2','Orif3','Flco1','Flco2','Flco3','Fl6b1','Fl6b2','Flbx1','Flbx2','Fldi1','Fldi2','Fldi3','Fldi4','Fldi5','Flhb1','Flbs1'])('%s drawing failure recovers source defaults through Flan1 without modifying caller state',routeId=>{
  const initial=createInitialState(culture),before=structuredClone(initial);
  const failed:Catalog={revision:catalog.revision,table:id=>catalog.table(id),template(id){if(id.toLowerCase()===`${routeId.slice(0,4).toLowerCase()}/${routeId.toLowerCase()}.dxf`)throw new Error('PRIVATE drawing read failure');return catalog.template(id);}};
  const result=transition(initial,{type:'select-route',routeId},failed,registerRoutes(routes));
  expect(initial).toEqual(before);expect(result.state.routeId).toBe('Flan1');expect(result.state.revision).toBe(1);
  expect(result.state.values.MainSize).toBe(16);expect(result.state.values.ASMEClass).toBe('300#');
  expect(result.view.headers).toEqual(refs.cases[0].expected.view.headers);
  expect(result.view.messages[0]).toContain('encountered a problem at '+routeId);expect(JSON.stringify(result.view)).not.toContain('PRIVATE');
  expect(result.trace).toContainEqual({operation:'ErrorCatch',sourceId:routeId});
});

test('Flaa1 retains RTJ when class150 disables it and rejects disabled new selections',()=>{
  const registry=registerRoutes(routes);
  let result=transition(createInitialState(culture),{type:'select-route',routeId:'Flaa1'},catalog,registry);
  result=transition(result.state,{type:'select-option',controlId:'Face',value:'RTJ'},catalog,registry);
  const before=structuredClone(result.state);
  result=transition(result.state,{type:'select-option',controlId:'ASMEClass',value:'150#'},catalog,registry);
  expect(before.values.ASMEClass).toBe('300#');expect(result.state.values.Face).toBe('RTJ');expect(result.state.legacySession!.settings.Flaa.Face).toBe('RTJ');
  expect(result.view.textResults?.status).toBe('unavailable');
  expect(result.view.controls.find(c=>c.id==='Face')!.options.find(o=>o.value==='RTJ')!.enabled).toBe(false);
  for(const value of ['1500#','2500#'])expect(()=>transition(result.state,{type:'select-option',controlId:'ASMEClass',value},catalog,registry)).toThrow('Selection is not available');
});
test.each(['1500#','2500#'])('Flaa1 persisted %s retains missing-table source recovery instead of correcting class',cls=>{
  const state=createInitialState(culture);state.routeId='Flaa1';loadSettings(state);state.values.ASMEClass=cls;saveSettings(state);
  const result=transition(state,{type:'select-route',routeId:'Flaa1'},catalog,registerRoutes(routes));
  expect(state.legacySession!.settings.Flaa.ASMEClass).toBe(cls);
  expect(result.state.routeId).toBe('Flan1');expect(result.trace).toContainEqual({operation:'ErrorCatch',sourceId:'Flaa1'});
});

test('Orif1 retains RTJ when class300 hides Face and restores Face at class600',()=>{
  const registry=registerRoutes(routes);
  let result=transition(createInitialState(culture),{type:'select-route',routeId:'Orif1'},catalog,registry);
  expect(result.view.controls.find(c=>c.id==='Face')!.visible).toBe(false);
  result=transition(result.state,{type:'select-option',controlId:'ASMEClass',value:'600#'},catalog,registry);
  result=transition(result.state,{type:'select-option',controlId:'Face',value:'RTJ'},catalog,registry);
  result=transition(result.state,{type:'select-option',controlId:'ASMEClass',value:'300#'},catalog,registry);
  expect(result.state.values.Face).toBe('RTJ');expect(result.state.values.SubTab).toBe('Orif1');
  expect(result.view.controls.find(c=>c.id==='Face')!.visible).toBe(false);
  expect(result.view.headers[3]).toContain('RTJ Ring No : ');
  expect(()=>transition(result.state,{type:'select-option',controlId:'Face',value:'RF'},catalog,registry)).toThrow('Selection is not available');
  result=transition(result.state,{type:'select-option',controlId:'ASMEClass',value:'600#'},catalog,registry);
  expect(result.view.controls.find(c=>c.id==='Face')!.visible).toBe(true);expect(result.state.values.SubTab).toBe('Orif1a');
});

test('Orif2 corrects retained RTJ and class before drawing and persists the corrections',()=>{
  const state=createInitialState(culture);state.routeId='Orif2';loadSettings(state);Object.assign(state.values,{Face:'RTJ',ASMEClass:'900#'});saveSettings(state);
  const before=structuredClone(state);const templates:string[]=[];
  const tracked:Catalog={revision:catalog.revision,table:id=>catalog.table(id),template(id){templates.push(id);return catalog.template(id);}};
  const result=transition(state,{type:'select-route',routeId:'Orif2'},tracked,registerRoutes(routes));
  expect(state).toEqual(before);expect(templates[0]).toBe('Orif/Orif2.dxf');expect(result.state.routeId).toBe('Orif2');
  expect(result.state.values.Face).toBe('RF');expect(result.state.values.ASMEClass).toBe('300#');
  expect(result.state.legacySession!.settings.Orif).toMatchObject({Face:'RF',ASMEClass:'300#'});
});

test('Orif3 preserves inherited ChkType while correcting shared family settings',()=>{
  const state=createInitialState(culture);state.routeId='Orif3';loadSettings(state);Object.assign(state.values,{Face:'RTJ',ASMEClass:'900#',ChkType:'U_F_C_Z'});saveSettings(state);
  const result=transition(state,{type:'select-route',routeId:'Orif3'},catalog,registerRoutes(routes));
  expect(result.state.routeId).toBe('Orif3');expect(result.state.values.ChkType).toBe('U_F_C_Z');
  expect(result.state.values).toMatchObject({Face:'RF',ASMEClass:'300#',FaceIndex:1});
  expect(result.state.legacySession!.settings.Orif).toMatchObject({Face:'RF',ASMEClass:'300#'});
});

test.each([
  ['300#',5,'Flre1'],['300#',4,'Flre1a'],['150#',5,'Flre1b'],['150#',4,'Flre1c'],
] as const)('Flre1 %s small%s drawing %s failure uses source recovery', (cls,small,drawing)=>{
  const initial=createInitialState(culture);initial.routeId='Flre1';loadSettings(initial);Object.assign(initial.values,{ASMEClass:cls,SmallSize:small,MainSize:8});saveSettings(initial);
  const before=structuredClone(initial);
  const failed:Catalog={revision:catalog.revision,table:id=>catalog.table(id),template(id){if(id===`Flre/${drawing}.dxf`)throw new Error('PRIVATE drawing failure');return catalog.template(id);}};
  const result=transition(initial,{type:'select-route',routeId:'Flre1'},failed,registerRoutes(routes));
  expect(initial).toEqual(before);expect(result.state.routeId).toBe('Flan1');expect(result.view.headers).toEqual(refs.cases[0].expected.view.headers);
  expect(result.trace).toContainEqual({operation:'ErrorCatch',sourceId:'Flre1'});expect(JSON.stringify(result.view)).not.toContain('PRIVATE');
});

test.each([[5,'Flre2'],[4,'Flre2a']] as const)('Flre2 small%s drawing %s failure recovers source defaults',(small,drawing)=>{
  const initial=createInitialState(culture);initial.routeId='Flre2';loadSettings(initial);Object.assign(initial.values,{SmallSize:small,MainSize:8});saveSettings(initial);
  const before=structuredClone(initial);
  const failed:Catalog={revision:catalog.revision,table:id=>catalog.table(id),template(id){if(id===`Flre/${drawing}.dxf`)throw new Error('PRIVATE drawing failure');return catalog.template(id);}};
  const result=transition(initial,{type:'select-route',routeId:'Flre2'},failed,registerRoutes(routes));
  expect(initial).toEqual(before);expect(result.state.routeId).toBe('Flan1');expect(result.view.headers).toEqual(refs.cases[0].expected.view.headers);
  expect(result.trace).toContainEqual({operation:'ErrorCatch',sourceId:'Flre2'});expect(JSON.stringify(result.view)).not.toContain('PRIVATE');
});
test('Flre2 retains inherited ChkType and SubSubTab values',()=>{
  const initial=createInitialState(culture);Object.assign(initial.values,{ChkType:'U_C_Z_M',SubSubTab:'Flre1b',SubSubSubTab:'Flre1c'});
  const result=transition(initial,{type:'select-route',routeId:'Flre2'},catalog,registerRoutes(routes));
  expect(result.state.values).toMatchObject({ChkType:'U_C_Z_M',SubSubTab:'Flre1b',SubSubSubTab:'Flre1c'});
});

test('Flbx2 header numeric overflow preserves source-specific _Headers recovery identity',()=>{
  const initial=createInitialState(culture),before=structuredClone(initial);
  const broken:Catalog={revision:catalog.revision,table(id){const table=catalog.table(id);if(id==='Flbx/FlbxBT4.csv'){const rows=table.rows.map(row=>[...row]);rows[7][19]='1E999';return {...table,rows};}return table;},template:id=>catalog.template(id)};
  const result=transition(initial,{type:'select-route',routeId:'Flbx2'},broken,registerRoutes(routes));
  expect(initial).toEqual(before);expect(result.state.routeId).toBe('Flan1');expect(result.state.values.ActiveSub).toBe('Flbx2_Headers');
  expect(result.trace).toContainEqual({operation:'ErrorCatch',sourceId:'Flbx2_Headers'});
  expect(result.view.messages[0]).toContain('encountered a problem at Flbx2_Headers');
});

test('Fldi1 PN16 is selectable through the source PN button and persists its real table',()=>{
  const registry=registerRoutes(routes);
  let result=transition(createInitialState(culture),{type:'select-route',routeId:'Fldi1'},catalog,registry);
  result=transition(result.state,{type:'select-option',controlId:'DinClass',value:'16'},catalog,registry);
  expect(result.state.values.DinClass).toBe('16');expect(result.state.legacySession!.settings.Fldi.DinClass).toBe('16');
  expect(result.view.controls.find(c=>c.id==='DinClass')!.text).toBe('PN 16');
  expect(result.trace).toContainEqual({operation:'load-bank',sourceId:'Fldi/Fldi_16.csv'});
});

test('Fldi3 high-PN settings always save missing fields even when size is already valid',()=>{
  const state=createInitialState(culture);state.routeId='Fldi3';
  state.legacySession!.settings.Fldi={MainSize:7,DinClass:'160',Face:'RF'};
  loadSettings(state);
  expect(state.values.MainSize).toBe(7);expect(state.values.DinClass).toBe('160');
  expect(state.legacySession!.settings.Fldi.SmallSize).toBe(0);
});

test('Fldi4 corrects PN2.5 to PN6 before any table lookup',()=>{
  const state=createInitialState(culture);state.routeId='Fldi4';
  state.legacySession!.settings.Fldi={MainSize:8,DinClass:'2.5',Face:'RF'};loadSettings(state);
  expect(state.values.DinClass).toBe('6');expect(state.legacySession!.settings.Fldi.DinClass).toBe('6');
});

test('Flhb1 header overflow preserves source Headers recovery name without an underscore',()=>{
  const initial=createInitialState(culture);initial.routeId='Flhb1';loadSettings(initial);initial.values.MainSize=4;saveSettings(initial);const before=structuredClone(initial);
  const broken:Catalog={revision:catalog.revision,table(id){const table=catalog.table(id);if(id==='Flhb/Flhb1STD.csv'){const rows=table.rows.map(row=>[...row]);rows[3][10]='1E999';return {...table,rows};}return table;},template:id=>catalog.template(id)};
  const result=transition(initial,{type:'select-route',routeId:'Flhb1'},broken,registerRoutes(routes));
  expect(initial).toEqual(before);expect(result.state.routeId).toBe('Flan1');expect(result.state.values.ActiveSub).toBe('Flhb1Headers');
  expect(result.trace).toContainEqual({operation:'ErrorCatch',sourceId:'Flhb1Headers'});
});

test('Flbs1 alternate table drawing failure recovers source defaults',()=>{
  const initial=createInitialState(culture);initial.routeId='Flbs1';loadSettings(initial);initial.values.Table='H';saveSettings(initial);const before=structuredClone(initial);
  const failed:Catalog={revision:catalog.revision,table:id=>catalog.table(id),template(id){if(id==='Flbs/Flbs1a.dxf')throw new Error('PRIVATE alternate drawing failure');return catalog.template(id);}};
  const result=transition(initial,{type:'select-route',routeId:'Flbs1'},failed,registerRoutes(routes));
  expect(initial).toEqual(before);expect(result.state.routeId).toBe('Flan1');expect(result.trace).toContainEqual({operation:'ErrorCatch',sourceId:'Flbs1'});
});
