import { expect, test,vi } from 'vitest';
import { resolve } from 'node:path';
import wire from '../reference/state-codec/special-sparse.json';
import { decodeWorkState, encodeWorkState } from '../../src/legacy/state/codec';
import type { WorkState } from '../../src/legacy/contracts';
vi.mock('server-only',()=>({}));
const copy = (): any => structuredClone(wire);
function rootEntry(payload: any, key: string): any { return payload.state[1].find((e: any) => e[0] === key); }
test('real Flan1 to Flan7 hidden-weight continuation survives JSON storage without resetting source state',async()=>{
  const [{loadCatalog},{createInitialState},{transition},{registerRoutes},{Flan1},{Flan7},{loadFlangeCases}]=await Promise.all([
    import('../../src/server/catalog'),import('../../src/legacy/state/initial'),import('../../src/legacy/state/transition'),import('../../src/legacy/registry'),import('../../src/legacy/features/flanges/flan/Flan1'),import('../../src/legacy/features/flanges/flan/Flan7'),import('../reference/flange-cases')]);
  const catalog=await loadCatalog(resolve('private/catalog')),registry=registerRoutes([Flan1,Flan7]);
  const first=transition(createInitialState({name:'en-US',decimalSeparator:'.',groupSeparator:','}),{type:'select-route',routeId:'Flan1'},catalog,registry);
  const prior=loadFlangeCases('Flan1')[0].expected.view.textResults!.rows.find(r=>r.id==='flange-weight')!.value;
  expect(first.state.values.Flange_wt).toBe(prior);
  const restored=decodeWorkState(JSON.parse(JSON.stringify(encodeWorkState(first.state))));
  const action={type:'select-route' as const,routeId:'Flan7'},direct=transition(first.state,action,catalog,registry),resumed=transition(restored,action,catalog,registry);
  const reference=loadFlangeCases('Flan7').find(c=>c.initial.Units==='Metric'&&c.initial.Face==='RF'&&c.initial.MainSize===16&&c.initial.Flange_wt===prior)!;
  expect(direct.state.values.Flange_wt).toBe(reference.expected.sourceValues!.Flange_wt);
  expect(direct.view).toEqual(reference.expected.view);expect(resumed).toEqual(direct);expect(first.state.values.Flange_wt).toBe(prior);
});
test('decodes independently authored special-value and sparse wire without flattening distinctions', () => {
  const s = decodeWorkState(wire);
  expect(Object.is(s.values.negativeZero, -0)).toBe(true);
  expect(s.values.nan).toBeNaN();
  expect(s.values.positive).toBe(Infinity);
  expect(s.values.negative).toBe(-Infinity);
  expect(s.values.precise).toBe(1.2345678901234567);
  expect(s.values.literal).toBe('["number","NaN"]');
  const row = s.legacyBuffers.activeDba[1][3] as unknown as (string | null)[];
  expect(row.length).toBe(1001);
  expect(Object.hasOwn(row, 0)).toBe(true); expect(row[0]).toBeNull();
  expect(Object.hasOwn(row, 1)).toBe(false);
  expect(row[4]).toBe('0.065'); expect(row[1000]).toBe('');
  expect((s.legacyBuffers.lineMem as unknown[]).length).toBe(10001);
  expect(Object.keys(s.legacyBuffers.lineMem)).toEqual(['10000']);
  expect(encodeWorkState(s)).toEqual(wire);
});
test('encodes literal expected nodes and preserves numeric bits through actual JSON storage', () => {
  const state: WorkState = { routeId: 'Pipe1', culture: { name: 'en-US', decimalSeparator: '.', groupSeparator: ',' }, values: { n: -0, x: NaN, precision: Number.MIN_VALUE }, history: { ids: ['Pipe1'], index: 0 }, legacyBuffers: { activeDba: {}, lineMem: {} }, revision: 0 };
  const encoded = encodeWorkState(state);
  expect(rootEntry(encoded, 'values')[1]).toEqual(['object', [['n',['number','-0']],['x',['number','NaN']],['precision',['number','5e-324']]]]);
  const decoded = decodeWorkState(JSON.parse(JSON.stringify(encoded)));
  expect(Object.is(decoded.values.n, -0)).toBe(true); expect(decoded.values.x).toBeNaN(); expect(decoded.values.precision).toBe(Number.MIN_VALUE);
});
const mutations: [string, (p: any) => void][] = [
  ['unknown codec', p => p.codecVersion = 2], ['unknown schema', p => p.stateSchemaVersion = 2],
  ['extra envelope field', p => p.secret = 'private-marker'], ['unknown tag', p => p.state[0] = 'constructor'],
  ['duplicate tag payload', p => p.state.push('object')], ['duplicate property', p => p.state[1].push(p.state[1][0])],
  ['unknown state property', p => p.state[1].push(['unknown',['string','x']])],
  ['prototype key', p => p.state[1].push(['__proto__',['object',[]]])],
  ['nested constructor key', p => rootEntry(p,'values')[1][1].push(['constructor',['string','x']])],
  ['numeric overflow', p => rootEntry(p,'revision')[1] = ['number','1e999']],
  ['noncanonical number', p => rootEntry(p,'revision')[1] = ['number','01']],
  ['numeric payload type', p => rootEntry(p,'revision')[1] = ['number',2]],
  ['invalid index', p => rootEntry(p,'history')[1][1][0][1] = ['array',1,[[-1,['string','Pipe1']]]]],
  ['duplicate index', p => rootEntry(p,'history')[1][1][0][1] = ['array',1,[[0,['string','Pipe1']],[0,['string','Pipe1']]]]],
  ['out of range index', p => rootEntry(p,'history')[1][1][0][1] = ['array',1,[[1,['string','Pipe1']]]]],
  ['hole in history', p => rootEntry(p,'history')[1][1][0][1] = ['array',1,[]]],
  ['unbounded sparse array', p => rootEntry(p,'legacyBuffers')[1][1][1][1] = ['array',4294967295,[]]],
  ['undefined cell not proven by .NET string array', p => rootEntry(p,'legacyBuffers')[1][1][1][1] = ['object',[['0',['object',[['0',['undefined']]]]]]]],
  ['null scalar not permitted', p => rootEntry(p,'values')[1][1].push(['bad',['null']])],
  ['wrong culture', p => rootEntry(p,'culture')[1][1][0][1] = ['string','ar-EG']],
  ['revision NaN', p => rootEntry(p,'revision')[1] = ['number','NaN']],
  ['invalid history cursor', p => rootEntry(p,'history')[1][1][1][1] = ['number','3']],
  ['bank out of source bounds', p => rootEntry(p,'legacyBuffers')[1][1][0][1] = ['object',[['6',['object',[]]]]]],
];
for (const [name, mutate] of mutations) test(`rejects ${name} without modifying stored payload or leaking it`, () => {
  const p = copy(); mutate(p); const before = structuredClone(p);
  expect(() => decodeWorkState(p)).toThrow('Invalid private work state');
  expect(p).toEqual(before); expect(({} as any).polluted).toBeUndefined();
});
test('rejects cycles, accessors, unsupported runtime objects and undefined values at encode boundary', () => {
  const valid = () => decodeWorkState(wire);
  const cyclic = valid(); (cyclic.values as any).cycle = cyclic;
  const accessor = valid(); Object.defineProperty(accessor.values, 'secret', { enumerable: true, get() { throw new Error('private-marker'); } });
  for (const state of [cyclic, accessor, { ...valid(), values: { x: new Date() } }, { ...valid(), values: { x: undefined } }, { ...valid(), values: { x: 1n } }]) {
    expect(() => encodeWorkState(state as WorkState)).toThrow('Invalid private work state');
  }
});
