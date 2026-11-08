import { expect,test,vi } from 'vitest';
import { readFileSync,readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { valveRoutes } from '../../src/legacy/features/valves';
import { strainerRoutes } from '../../src/legacy/features/strainers';
import { fastenerRoutes } from '../../src/legacy/features/fasteners';
import { flangeRoutes } from '../../src/legacy/features/flanges';
import { registerRoutes } from '../../src/legacy/registry';
import { loadCatalog } from '../../src/server/catalog';
import { createInitialState } from '../../src/legacy/state/initial';
import { configureState } from '../../src/legacy/state/configure';
import { loadSettings,saveSettings } from '../../src/legacy/state/settings';
import { transition } from '../../src/legacy/state/transition';
import { assertReferenceFixture } from '../reference/schema';
import type { DrawCommand,LegacyView } from '../../src/legacy/contracts';
vi.mock('server-only',()=>({}));
const routes=[...valveRoutes,...strainerRoutes,...fastenerRoutes];
const registry=registerRoutes([...flangeRoutes,...routes]);
const culture={name:'en-US',decimalSeparator:'.',groupSeparator:','};
const catalog=await loadCatalog(resolve('private/catalog'));
type Case={id:string;culture:string;sourceRefs:unknown[];initial:Record<string,string|number>;actions:{routeId:string}[];expected:{view:LegacyView;mainSize:number;files:string[];lineCounts:number[];bankFingerprint:string}};
for(const file of readdirSync('tests/reference/valves-strainers-fasteners').filter(f=>f.endsWith('.json'))){
  const fixture=JSON.parse(readFileSync('tests/reference/valves-strainers-fasteners/'+file,'utf8'));
  for(const c of fixture.cases as Case[])test(c.id+' matches independent source recipe and drawing'+(['Vlbw1','Vlbw2'].includes(c.actions[0].routeId)&&c.initial.Face==='RTJ'?' (persisted Face=RTJ)':''),()=>{
    assertReferenceFixture(c);const routeId=c.actions[0].routeId;
    expect(registry.classify(routeId)).toBe('implemented');
    const state=createInitialState(culture);state.routeId=routeId;loadSettings(state);
    const initial=c.initial;
    configureState(state,{type:'configure',units:initial.Units==='Imperial'?'Imperial':'Metric',listUnits:initial.ListUnits==='Millimetres'?'Millimetres':'Inches',temperature:'Celsius',fractions:initial.Fractionize==='Yes'},catalog);
    Object.assign(state.values,initial);saveSettings(state);
    const result=transition(state,{type:'select-route',routeId},catalog,registry);
    const expected=structuredClone(c.expected.view),drawing=expected.drawing as typeof expected.drawing & {geometryRef?:string};
    if(drawing.geometryRef){drawing.commands.push(...fixture.geometries[drawing.geometryRef] as DrawCommand[]);delete drawing.geometryRef;}
    expect(result.view).toEqual(expected);
    expect(result.state.values.MainSize).toBe(c.expected.mainSize);
    expect(result.trace.filter(t=>t.operation==='load-bank').map(t=>t.sourceId)).toEqual(c.expected.files);
    expect(c.expected.lineCounts.map((_,i)=>result.state.values['LineQtyDbase'+(i+1)])).toEqual(c.expected.lineCounts);
    const tuples=Object.entries(result.state.legacyBuffers.activeDba).flatMap(([b,rr])=>Object.entries(rr).flatMap(([r,cc])=>Object.entries(cc).map(([col,v])=>[Number(b),Number(r),Number(col),v])));
    expect(createHash('sha256').update(JSON.stringify(tuples)).digest('hex')).toBe(c.expected.bankFingerprint);
  });
}
