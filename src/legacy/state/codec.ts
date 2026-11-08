import type { WorkState, LegacySession } from '../contracts';
import { assertLegacyCulture } from '../vb/culture';
import { validateLegacyView } from './view-schema';
import { savedFields, numberFields } from './settings';
export type StateNode = ['string', string] | ['number', string] | ['boolean', boolean] | ['null'] | ['undefined'] | ['object', [string, StateNode][]] | ['array', number, [number, StateNode][]];
export type EncodedWorkState = { codecVersion: 1; stateSchemaVersion: 1 | 2 | 3; state: StateNode };
export function upgradeWorkStateV1(payload:unknown,session:LegacySession):WorkState {
  return protect(()=>{
    const old=decodeWorkState(payload);
    if(old.legacySession)invalid();
    return decodeWorkState(encodeWorkState({...old,legacySession:session}));
  });
}
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
function invalid(): never { throw new Error('Invalid private work state'); }
function plain(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
}
function keys(v: unknown, expected: string[]): asserts v is Record<string, unknown> {
  if (!plain(v) || Reflect.ownKeys(v).length !== expected.length || expected.some(k => !Object.hasOwn(v, k))) invalid();
}
function safeDescriptors(v: object): void {
  for (const k of Reflect.ownKeys(v)) {
    if (typeof k !== 'string') invalid();
    const d = Object.getOwnPropertyDescriptor(v, k)!;
    if (!Object.hasOwn(d, 'value') || (!d.enumerable && !(Array.isArray(v) && k === 'length'))) invalid();
  }
}
function integer(v: unknown, max = Number.MAX_SAFE_INTEGER): v is number { return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && !Object.is(v, -0) && v <= max; }
function indexKey(k: string, max: number): boolean { return /^(0|[1-9]\d*)$/.test(k) && integer(Number(k), max); }
function sparse(v: unknown, bounds: number[]): void {
  if (!plain(v) && !Array.isArray(v)) invalid();
  const [bound, ...rest] = bounds;
  if (Array.isArray(v) && v.length > bound + 1) invalid();
  for (const k of Object.keys(v)) {
    if (!indexKey(k, bound)) invalid();
    const cell = (v as Record<string, unknown>)[k];
    if (rest.length) sparse(cell, rest);
    else if (cell !== null && typeof cell !== 'string') invalid();
  }
}
function validateState(v: unknown): asserts v is WorkState {
  const hasSession=plain(v)&&Object.hasOwn(v,'legacySession');
  keys(v, ['routeId','culture','values','history','legacyBuffers','revision',...(hasSession?['legacySession']:[])]);
  if (typeof v.routeId !== 'string' || !v.routeId || !integer(v.revision)) invalid();
  keys(v.culture, ['name','decimalSeparator','groupSeparator']);
  assertLegacyCulture(v.culture as WorkState['culture']);
  if (!plain(v.values)) invalid();
  for (const [k, value] of Object.entries(v.values)) {
    if (forbidden.has(k) || !['string','number','boolean'].includes(typeof value)) invalid();
  }
  keys(v.history, ['ids','index']);
  const ids = v.history.ids;
  if (!Array.isArray(ids) || !integer(v.history.index) || v.history.index >= ids.length || !ids.length || Object.keys(ids).length !== ids.length) invalid();
  if (ids.some(id => typeof id !== 'string' || !id)) invalid();
  const hasDrawing=plain(v.legacyBuffers)&&Object.hasOwn(v.legacyBuffers,'drawing');
  keys(v.legacyBuffers, ['activeDba','lineMem',...(hasDrawing?['drawing']:[])]);
  sparse(v.legacyBuffers.activeDba, [5,1000,1000]);
  sparse(v.legacyBuffers.lineMem, [10000,10]);
  if(hasDrawing){
    const drawing=v.legacyBuffers.drawing;
    keys(drawing,['lineVar2','c','colr','linetype','sc','lc','factor']);
    sparse(drawing.lineVar2,[200000]);
    if(!integer(drawing.c)||!integer(drawing.colr)||!integer(drawing.linetype,10000)||!integer(drawing.sc,200001)||!integer(drawing.lc,10001)||typeof drawing.factor!=='number'||!Number.isFinite(drawing.factor))invalid();
  }
  if(hasSession){
    keys(v.legacySession,['settings','lastView']);
    if(!plain(v.legacySession.settings))invalid();
    const allowed='Settings Ftbw Ftsc Ftsw Fswa Flan Flaa Flap Orif Flre Flco Fl6b Flbx Fldi Flhb Flbs Gflt Gspr Grtj Vlfl Vlbw Vlsc Vlsw Wbol Nuts Blnu Srra Srrb Srrc Srrd Srre Fxly Span Gpas'.split(' ');
    for(const [key,fields] of Object.entries(v.legacySession.settings)){
      if(!allowed.includes(key)||!plain(fields))invalid();
      for(const [field,value] of Object.entries(fields)){
        if(!savedFields.includes(field)&&!(field==='Actuator'&&key==='Vlfl'))invalid();
        if(typeof value!==(numberFields.has(field)?'number':'string'))invalid();
      }
    }
    if(v.legacySession.lastView!==null)validateLegacyView(v.legacySession.lastView);
    if(ids.length>10||new Set(ids).size!==ids.length)invalid();
  }
}
function numberText(n: number): string {
  return Object.is(n, -0) ? '-0' : Number.isNaN(n) ? 'NaN' : n === Infinity ? '+Infinity' : n === -Infinity ? '-Infinity' : String(n);
}
function parseNumber(s: unknown): number {
  if (typeof s !== 'string') return invalid();
  const n = s === '+Infinity' ? Infinity : s === '-Infinity' ? -Infinity : s === 'NaN' ? NaN : Number(s);
  if (numberText(n) !== s) invalid();
  return n;
}
function protect<T>(run: () => T): T {
  try { return run(); } catch { return invalid(); }
}
export function encodeWorkState(state: WorkState): EncodedWorkState {
  return protect(() => {
    const seen = new Set<object>();
    function encode(v: unknown, depth = 0): StateNode {
      if (depth > 32) return invalid();
      if (v === null) return ['null'];
      if (v === undefined) return ['undefined'];
      if (typeof v === 'string') return ['string',v];
      if (typeof v === 'number') return ['number',numberText(v)];
      if (typeof v === 'boolean') return ['boolean',v];
      if (typeof v !== 'object' || (!plain(v) && !Array.isArray(v)) || seen.has(v)) return invalid();
      safeDescriptors(v); seen.add(v);
      let node: StateNode;
      if (Array.isArray(v)) {
        node = ['array',v.length,Object.keys(v).map(k => {
          if (!indexKey(k, v.length - 1)) return invalid();
          return [Number(k),encode(v[Number(k)], depth + 1)];
        })];
      } else node = ['object',Object.keys(v).map(k => {
        if (forbidden.has(k)) return invalid();
        return [k,encode((v as Record<string, unknown>)[k], depth + 1)];
      })];
      seen.delete(v);
      return node;
    }
    const node = encode(state);
    validateState(state);
    return { codecVersion: 1, stateSchemaVersion: state.legacyBuffers.drawing ? 3 : state.legacySession ? 2 : 1, state: node };
  });
}
export function decodeWorkState(payload: unknown): WorkState {
  return protect(() => {
    // Only JSON data enters the decoder; descriptors and prototypes cannot run getters.
    const seen = new Set<object>();
    function inspect(v: unknown, depth = 0): void {
      if (depth > 64) invalid();
      if (typeof v !== 'object' || v === null) return;
      if ((!plain(v) && !Array.isArray(v)) || seen.has(v)) invalid();
      safeDescriptors(v); seen.add(v);
      for (const k of Object.keys(v)) inspect((v as Record<string, unknown>)[k], depth + 1);
      seen.delete(v);
    }
    inspect(payload);
    keys(payload, ['codecVersion','stateSchemaVersion','state']);
    if (payload.codecVersion !== 1 || ![1,2,3].includes(payload.stateSchemaVersion as number)) invalid();
    function tuple(v: unknown, length: number): asserts v is unknown[] {
      if (!Array.isArray(v) || v.length !== length || Object.keys(v).length !== length) invalid();
    }
    function decode(v: unknown, depth = 0): unknown {
      if (depth > 32 || !Array.isArray(v)) return invalid();
      const tag = v[0];
      if (tag === 'null' || tag === 'undefined') { tuple(v,1); return tag === 'null' ? null : undefined; }
      if (tag === 'string' || tag === 'number' || tag === 'boolean') {
        tuple(v,2);
        if (tag === 'number') return parseNumber(v[1]);
        if (typeof v[1] !== tag) return invalid();
        return v[1];
      }
      if (tag !== 'object' && tag !== 'array') return invalid();
      tuple(v, tag === 'object' ? 2 : 3);
      const entries = v[tag === 'object' ? 1 : 2];
      if (!Array.isArray(entries) || Object.keys(entries).length !== entries.length) return invalid();
      // Setting a sparse JS length allocates no dense cells; source bounds are checked by schema.
      if (tag === 'array' && !integer(v[1], 4294967295)) return invalid();
      const out: Record<string, unknown> | unknown[] = tag === 'object' ? {} : new Array(v[1] as number);
      const names = new Set<string>();
      for (const pair of entries) {
        tuple(pair,2);
        const k = pair[0];
        if (tag === 'array' ? !integer(k, (v[1] as number) - 1) : typeof k !== 'string' || forbidden.has(k)) return invalid();
        const name = String(k);
        if (names.has(name)) return invalid();
        names.add(name);
        Object.defineProperty(out, name, { value: decode(pair[1], depth + 1), enumerable: true, writable: true, configurable: true });
      }
      return out;
    }
    const state = decode(payload.state);
    validateState(state);
    if((state.legacyBuffers.drawing?3:state.legacySession?2:1)!==payload.stateSchemaVersion)invalid();
    return state;
  });
}
