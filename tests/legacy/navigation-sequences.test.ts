import { expect, test, vi } from 'vitest';
import { resolve } from 'node:path';
import { loadCatalog } from '../../src/server/catalog';
import { createInitialState } from '../../src/legacy/state/initial';
import { decodeWorkState, encodeWorkState } from '../../src/legacy/state/codec';
import { readCell, writeCell } from '../../src/legacy/state/buffers';
import { transition } from '../../src/legacy/state/transition';
import { loadFlangeCases } from '../reference/flange-cases';
import sourceIndex from '../../evidence/route-index.json';
import parityLedger from '../../evidence/parity-ledger.json';
import type { CoverageIndex, ParityCard } from '../../tools/evidence/types';
import { checkFunctionalCoverage } from '../../tools/evidence/coverage';

vi.mock('server-only', () => ({}));
const catalog = await loadCatalog(resolve('private/catalog'));
const initial = () => createInitialState({name:'en-US', decimalSeparator:'.', groupSeparator:','});
const open = (routeId: string, state = initial()) => transition(state, {type:'select-route', routeId}, catalog);

test('core coverage reports the fixed dispatch denominator and separate visual waiver', () => {
  const report = checkFunctionalCoverage();
  expect(report.implementedRoutes).toHaveLength(167);
  expect(report.requiredRoutes).toEqual(expect.arrayContaining(['Comp1','Piwt1','Psiz1','Blnd1']));
  expect(report.functionalGaps).toEqual([]);
  expect(report.visualWaivers).toContain('unverified-visual-nonblocking');
});

test('a passed card with a missing test file leaves a functional gap', () => {
  const ledger = (parityLedger as ParityCard[]).map(card => card.id==='Flan1:functional'
    ? {...card, testIds:['tests/legacy/missing-reference.test.ts']}
    : card);
  const report = checkFunctionalCoverage(sourceIndex as CoverageIndex,ledger);
  expect(report.functionalGaps).toContainEqual(expect.objectContaining({routeId:'Flan1',code:'missing-evidence'}));
  expect(report.testedBranches.some(branch=>branch.cardId==='Flan1:functional')).toBe(false);
});

test.each([
  ['Comp1', /ASME Composite/, 'Flom/Flg150.csv'],
  ['Piwt1', /Pipe/i, 'Piwt/Piwt1_CarbonSteel_Metric.csv'],
  ['Psiz1', /Pipe Size Ready Reckoner/, 'Pipe/PipeSTD.csv'],
])('%s dispatches even though the source Find index omits it', (route, header, source) => {
  const result = open(route, open('Flan1').state);
  expect(result.state.routeId).toBe(route);
  expect(result.view.headers[0]).toMatch(header);
  expect(result.trace.some(entry => entry.sourceId === source)).toBe(true);
});

test('all four stale Find hits clear six headers and retain the last drawing without catalog reads', () => {
  const flange = open('Flan1');
  const found = transition(flange.state,{type:'search',query:'Spade'},catalog);
  expect(found.searchHits?.map(hit=>hit.id)).toEqual(expect.arrayContaining(['Blnd2','Blnd3','Blnd4']));
  const sourceDrawing = loadFlangeCases('Flan1')[0].expected.view.drawing;
  for (const id of ['Blnd1','Blnd2','Blnd3','Blnd4']) {
    const noReads = {...catalog, table:vi.fn(catalog.table), template:vi.fn(catalog.template)};
    const result = transition(decodeWorkState(encodeWorkState(found.state)), {type:'select-route',routeId:id}, noReads);
    expect(result.trace.at(-1)).toEqual({operation:'no-dispatch',sourceId:id});
    expect(result.view.headers.slice(0,6)).toEqual(Array(6).fill(''));
    expect(result.view.drawing).toEqual(sourceDrawing);
    expect(result.state.legacyBuffers).toEqual(flange.state.legacyBuffers);
    expect(noReads.table).not.toHaveBeenCalled();
    expect(noReads.template).not.toHaveBeenCalled();
  }
});

test('Gpas → flange → Gpas inherits the global color and respects drawing and database clearing boundaries', () => {
  const state = initial();
  state.legacyBuffers.drawing = {lineVar2:{20000:'clear',20001:'retain'}, c:0,colr:7,linetype:0,sc:1,lc:1,factor:0};
  state.legacyBuffers.lineMem = {1000:{10:'clear',0:'retain'},1001:{10:'retain'}};
  writeCell(state.legacyBuffers,1,1,1,'overwrite');
  writeCell(state.legacyBuffers,1,1000,1,'retain');
  writeCell(state.legacyBuffers,5,1000,1000,'retain');
  // Drawlines1 leaves colr alone for token 92. DoDrawing visits the empty trailing row.
  const first = open('Gpas1',state);
  expect(first.state.legacyBuffers.lineMem[1][6]).toBe('7');
  expect(first.state.legacyBuffers.drawing?.colr).toBe(0);
  const flange = open('Flan1',first.state);
  expect(flange.state.legacyBuffers.lineMem[1][6]).toBe('7'); // explicit DXF color 4
  expect(flange.state.legacyBuffers.drawing?.colr).toBe(0);
  const returned = open('Gpas1',decodeWorkState(encodeWorkState(flange.state)));
  const buffers = returned.state.legacyBuffers;
  expect(buffers.lineMem[1][6]).toBe('0');
  expect(buffers.lineMem[1000]).toMatchObject({10:'',0:'retain'});
  expect(buffers.lineMem[1001][10]).toBe('retain');
  expect(buffers.drawing?.lineVar2).toMatchObject({20000:'',20001:'retain'});
  expect(readCell(buffers,1,1,1)).not.toBe('overwrite');
  expect(readCell(buffers,1,1000,1)).toBe('retain');
  expect(readCell(buffers,5,1000,1000)).toBe('retain');
});

test('repeated units and family changes return the verified flange drawing and preserve unique history', () => {
  const source = loadFlangeCases('Flan1')[0].expected.view;
  let result = open('Flan1');
  for (let cycle=0; cycle<2; cycle++) {
    result = open('Gpas1',result.state);
    for (const units of ['Imperial','Metric'] as const) {
      result = transition(result.state,{type:'configure',units,listUnits:'Inches',temperature:'Celsius',fractions:false},catalog);
      expect(result.view.headers[1]).toBe(units==='Imperial'?'Gap = 1"':'Gap = 25');
      result = open('Flan1',result.state);
      expect(result.view.headers[1]).toContain(units==='Imperial'?'lb':'kg');
      if (units==='Metric') expect(result.view.drawing).toEqual(source.drawing);
      else result = open('Gpas1',result.state);
    }
  }
  expect(result.state.history.ids).toEqual(['Flan1','Gpas1']);
},30000);
