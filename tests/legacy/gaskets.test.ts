import { flangeRoutes } from '../../src/legacy/features/flanges';
import { gasketRoutes } from '../../src/legacy/features/gaskets';
import { expect,test,vi } from 'vitest';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { loadCatalog } from '../../src/server/catalog';
import { createInitialState } from '../../src/legacy/state/initial';
import { configureState } from '../../src/legacy/state/configure';
import { saveSettings,loadSettings,settingsKey } from '../../src/legacy/state/settings';
import { transition } from '../../src/legacy/state/transition';
import { encodeWorkState,decodeWorkState } from '../../src/legacy/state/codec';
import { registerRoutes } from '../../src/legacy/registry';
import { normalizeView } from '../reference/normalize';
import { assertReferenceFixture } from '../reference/schema';
import { loadFlangeCases } from '../reference/flange-cases';
import type { Catalog } from '../../src/legacy/contracts';
vi.mock('server-only',()=>({}));
const culture={name:'en-US',decimalSeparator:'.',groupSeparator:','};
const catalog=await loadCatalog(resolve('private/catalog'));
const routes=[...flangeRoutes,...gasketRoutes];
const refs={cases:loadFlangeCases('Flan1')};
const cases=gasketRoutes.flatMap(route=>loadFlangeCases(route.id));
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
test.each(['Gflt1','Gflt2','Gflt3','Gspr1','Gspr2','Gspr3','Grtj1','Grtj2','Grtj3'])('%s drawing failure recovers source defaults through Flan1 without modifying caller state',routeId=>{
  const initial=createInitialState(culture),before=structuredClone(initial);
  const failed:Catalog={revision:catalog.revision,table:id=>catalog.table(id),template(id){if(id.toLowerCase()===`${routeId.slice(0,4).toLowerCase()}/${routeId.toLowerCase()}.dxf`)throw new Error('PRIVATE drawing read failure');return catalog.template(id);}};
  const result=transition(initial,{type:'select-route',routeId},failed,registerRoutes(routes));
  expect(initial).toEqual(before);expect(result.state.routeId).toBe('Flan1');expect(result.state.revision).toBe(1);
  expect(result.state.values.MainSize).toBe(16);expect(result.state.values.ASMEClass).toBe('300#');
  expect(result.view.headers).toEqual(refs.cases[0].expected.view.headers);
  expect(result.view.messages[0]).toContain('encountered a problem at '+routeId);expect(JSON.stringify(result.view)).not.toContain('PRIVATE');
  expect(result.trace).toContainEqual({operation:'ErrorCatch',sourceId:routeId});
});

test.each(gasketRoutes)('gasket navigation $id retains untouched banks and resumes exact serialized state',route=>{
  const registry=registerRoutes(routes);
  const flange=transition(createInitialState(culture),{type:'select-route',routeId:'Flan1'},catalog,registry);
  const retained=structuredClone({three:flange.state.legacyBuffers.activeDba[3],four:flange.state.legacyBuffers.activeDba[4]});
  const ring=transition(flange.state,{type:'select-route',routeId:'Grtj3'},catalog,registry);
  expect(ring.state.legacyBuffers.activeDba[3]).toEqual(retained.three);
  expect(ring.state.legacyBuffers.activeDba[4]).toEqual(retained.four);
  const before=structuredClone(ring.state);
  const action={type:'select-route' as const,routeId:route.id};
  const restored=decodeWorkState(JSON.parse(JSON.stringify(encodeWorkState(before))));
  const next=transition(ring.state,action,catalog,registry);
  expect(transition(restored,action,catalog,registry)).toEqual(next);
  expect(ring.state).toEqual(before);
  expect(next.state.legacyBuffers.activeDba[3]).toEqual(retained.three);
  expect(next.state.legacyBuffers.activeDba[4]).toEqual(retained.four);
  expect(next.state.legacyBuffers.activeDba[2]).toEqual(before.legacyBuffers.activeDba[2]);
});

test('gasket navigation selects an offered size, persists it and rejects a disabled class',()=>{
  const registry=registerRoutes(routes);
  let result=transition(createInitialState(culture),{type:'select-route',routeId:'Gflt1'},catalog,registry);
  result=transition(result.state,{type:'select-option',controlId:'MainSize',value:'3'},catalog,registry);
  expect(result.state.values.MainSize).toBe(3);expect(result.state.legacySession!.settings.Gflt.MainSize).toBe(3);
  expect(()=>transition(result.state,{type:'select-option',controlId:'ASMEClass',value:'1500#'},catalog,registry)).toThrow('Selection is not available');
});
