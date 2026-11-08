import { formatLegacyDimension } from '../../src/legacy/vb/fractions';
import { fittingRoutes } from '../../src/legacy/features/fittings';
import { pipeRoutes } from '../../src/legacy/features/pipe';
import { branchRoutes } from '../../src/legacy/features/branches';
import { expect,test,vi } from 'vitest';
import { readFileSync,readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { loadCatalog } from '../../src/server/catalog';
import { createInitialState } from '../../src/legacy/state/initial';
import { configureState } from '../../src/legacy/state/configure';
import { loadSettings,saveSettings } from '../../src/legacy/state/settings';
import { transition } from '../../src/legacy/state/transition';
import { registerRoutes } from '../../src/legacy/registry';
import { flangeRoutes } from '../../src/legacy/features/flanges';
import { normalizeView } from '../reference/normalize';
import { assertReferenceFixture } from '../reference/schema';
import type { FeatureRoute } from '../../src/legacy/contracts';
import type { Catalog } from '../../src/legacy/contracts';
import { encodeWorkState,decodeWorkState } from '../../src/legacy/state/codec';
import { settingsKey } from '../../src/legacy/state/settings';
import { loadTask7Cases } from '../reference/task7-cases';
vi.mock('server-only',()=>({}));
const routes:FeatureRoute[]=[...fittingRoutes,...pipeRoutes,...branchRoutes];
const registry=registerRoutes([...flangeRoutes,...routes]);
const culture={name:'en-US',decimalSeparator:'.',groupSeparator:','};
const catalog=await loadCatalog(resolve('private/catalog'));
type Case={id:string;initial:Record<string,string|number>;actions:{routeId:string}[];expected:{view:unknown;mainSize:number;smallSize:number|null;files:string[];lineCounts:number[];bankFingerprint:string;available:boolean}};
const files=readdirSync('tests/reference/fittings-pipe-branches').filter(f=>f.endsWith('.json'));
for(const file of files){
  const cases=loadTask7Cases<Case>(file);
  for(const c of cases)test(c.id+' preserves independently derived recipe and drawing',()=>{
    assertReferenceFixture(c);
    const routeId=c.actions[0].routeId;
    expect(registry.classify(routeId)).toBe('implemented');
    const state=createInitialState(culture);state.routeId=routeId;loadSettings(state);
    const initial=c.initial;
    configureState(state,{type:'configure',units:initial.Units==='Imperial'?'Imperial':'Metric',listUnits:initial.ListUnits==='Millimetres'?'Millimetres':'Inches',temperature:'Celsius',fractions:initial.Fractionize==='Yes'},catalog);
    Object.assign(state.values,initial);saveSettings(state);
    const result=transition(state,{type:'select-route',routeId},catalog,registry),actual=normalizeView(result);
    expect(result.state.routeId).toBe(routeId);
    expect(actual.view).toEqual(c.expected.view);
    expect(result.state.values.MainSize).toBe(c.expected.mainSize);
    if(c.expected.smallSize!==null)expect(result.state.values.SmallSize).toBe(c.expected.smallSize);
    expect(result.trace.filter(t=>t.operation==='load-bank').map(t=>t.sourceId)).toEqual(c.expected.files);
    expect(c.expected.lineCounts.map((_,i)=>result.state.values['LineQtyDbase'+(i+1)])).toEqual(c.expected.lineCounts);
    const tuples=Object.entries(result.state.legacyBuffers.activeDba).flatMap(([b,rr])=>Object.entries(rr).flatMap(([r,cc])=>Object.entries(cc).map(([col,v])=>[Number(b),Number(r),Number(col),v])));
    expect(createHash('sha256').update(JSON.stringify(tuples)).digest('hex')).toBe(c.expected.bankFingerprint);
  });
}
test('Pipe Sch10 retains raw wall markers while numeric formatting rounds 0.065 and fractionizes',()=>{
  const state=createInitialState(culture);state.routeId='Pipe1';loadSettings(state);
  Object.assign(state.values,{Units:'Imperial',Sch:'10',MainSize:3});saveSettings(state);
  const decimal=transition(state,{type:'select-route',routeId:'Pipe1'},catalog,registry);
  expect(formatLegacyDimension({route:'Pipe1',bank:1,cell:'0.065',units:'Imperial',fractions:false,culture,inchSign:'"'})).toBe('0.06"');
  expect(formatLegacyDimension({route:'Pipe1',bank:1,cell:'0.065',units:'Imperial',fractions:true,culture,inchSign:'"'})).toBe('1/16"');
  expect(decimal.view.drawing.commands.some(c=>c.op==='text'&&c.text==='0.065')).toBe(true);
  const fraction=transition(decimal.state,{type:'configure',units:'Imperial',listUnits:'Inches',temperature:'Celsius',fractions:true},catalog,registry);
  expect(fraction.view.drawing.commands.some(c=>c.op==='text'&&c.text==='0.065')).toBe(true);
});

test.each(routes)('$id recovers a drawing read failure with source defaults and no private exception text',route=>{
  const initial=createInitialState(culture),before=structuredClone(initial);
  const broken:Catalog={revision:catalog.revision,table:id=>catalog.table(id),template(id){if(id.toLowerCase()===`${route.id.slice(0,4)}/${route.id}.dxf`.toLowerCase())throw new Error('PRIVATE recipe read error');return catalog.template(id);}};
  const result=transition(initial,{type:'select-route',routeId:route.id},broken,registry);
  expect(result.state.routeId).toBe('Flan1');expect(result.state.values.MainSize).toBe(16);
  expect(result.view.messages[0]).toContain('encountered a problem at '+route.id);
  expect(JSON.stringify(result.view)).not.toContain('PRIVATE');expect(initial).toEqual(before);
});

test.each(routes)('$id resumes after serialization and preserves untouched bank4',route=>{
  const initial=transition(createInitialState(culture),{type:'select-route',routeId:'Flan1'},catalog,registry).state;
  const before=structuredClone(initial),restored=decodeWorkState(JSON.parse(JSON.stringify(encodeWorkState(initial))));
  const action={type:'select-route' as const,routeId:route.id};
  const result=transition(initial,action,catalog,registry);
  expect(transition(restored,action,catalog,registry)).toEqual(result);
  expect(result.state.routeId).toBe(route.id);
  expect(result.state.legacyBuffers.activeDba[4]).toEqual(before.legacyBuffers.activeDba[4]);
  expect(initial).toEqual(before);
});

test('reducing-tee small-size control clamps the live row without rewriting saved small size',()=>{
  const state=createInitialState(culture);state.routeId='Ftbw7';loadSettings(state);
  Object.assign(state.values,{MainSize:16,SmallSize:100});saveSettings(state);
  const result=transition(state,{type:'select-route',routeId:'Ftbw7'},catalog,registry);
  expect(result.state.values.SmallSize).toBe(15);
  expect(result.state.legacySession!.settings[settingsKey('Ftbw7')].SmallSize).toBe(100);
  expect(()=>transition(result.state,{type:'select-option',controlId:'Sch',value:'5'},catalog,registry)).toThrow('Selection is not available');
});

test('reducers retain and read pipe bank2 from previous navigation',()=>{
  const flange=transition(createInitialState(culture),{type:'select-route',routeId:'Flan1'},catalog,registry);
  const result=transition(flange.state,{type:'select-route',routeId:'Ftbw9'},catalog,registry);
  const row=Number(result.state.values.MainSize),small=Number(result.state.values.SmallSize);
  expect(result.state.legacyBuffers.activeDba[1][row][39]).toBe(flange.state.legacyBuffers.activeDba[2][row][4]);
  expect(result.state.legacyBuffers.activeDba[1][row][44]).toBe(flange.state.legacyBuffers.activeDba[2][small][4]);
  expect(result.trace.filter(t=>t.operation==='load-bank').map(t=>t.sourceId)).toEqual(['Ftbw/ReducersSTD.csv']);
});

test.each(['Wbol3','Wbol6','Wbol9'])('%s lateral height includes the source diagonal radius and whole-number rounding',routeId=>{
  const state=createInitialState(culture);state.routeId=routeId;loadSettings(state);
  const result=transition(state,{type:'select-route',routeId},catalog,registry);
  // PipeSTD row16 OD168.3; Lol3000 row6 height46.04.
  // Round(sqrt((168.3/2)^2*2)+46.04) = 165.
  expect(result.state.legacyBuffers.activeDba[1][16][10]).toBe('165');
});

test('Piwt configuration converts nominal text exactly and preserves the source wall reload quirk',()=>{
  const state=createInitialState(culture);state.routeId='Piwt1';loadSettings(state);
  Object.assign(state.values,{PipeNominalBore:'6',PipeWallThk:'7.11'});saveSettings(state);
  configureState(state,{type:'configure',units:'Imperial',listUnits:'Millimetres',temperature:'Celsius',fractions:false},catalog);
  expect(state.values.PipeNominalBore).toBe('150');
  // frmConfigs converts the wall, visits Fxly1/2, then reloads unsaved Piwt settings.
  expect(state.values.PipeWallThk).toBe('7.11');
  configureState(state,{type:'configure',units:'Imperial',listUnits:'Inches',temperature:'Celsius',fractions:false},catalog);
  expect(state.values.PipeNominalBore).toBe('6');
  state.values.PipeNominalBore='6.0';saveSettings(state);
  configureState(state,{type:'configure',units:'Imperial',listUnits:'Millimetres',temperature:'Celsius',fractions:false},catalog);
  expect(state.values.PipeNominalBore).toBe('6.0');
});

test('persisted Wbpi class400 uses the source branch-menu counter without enabling its class option',()=>{
  const state=createInitialState(culture);state.routeId='Wbpi10';loadSettings(state);
  state.values.ASMEClass='400#';saveSettings(state);
  const result=transition(state,{type:'select-route',routeId:'Wbpi10'},catalog,registry);
  expect(result.view.controls[2].options.find(o=>o.value==='400#')!.enabled).toBe(false);
  // Ten branch rows, lower5: c=7 after DesigBtn2ForBranchSize.
  // Pipt4 row6 weight column8=1.89, projection column7=152.4.
  expect(result.view.headers[1]).toBe('Weight = 1.89kg');
  expect(result.state.legacyBuffers.activeDba[1][16][10]).toBe(' 236.55');
});
