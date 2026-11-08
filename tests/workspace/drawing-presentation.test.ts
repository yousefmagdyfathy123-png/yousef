import { expect, test, vi } from 'vitest';
import { resolve } from 'node:path';
import { loadCatalog } from '../../src/server/catalog';
import { createInitialState } from '../../src/legacy/state/initial';
import { transition } from '../../src/legacy/state/transition';
import { toPublicWorkResult } from '../../src/server/engineering/public-result';
import { parsePublicWorkResult } from '../../src/shared/public-schemas';
import { drawingPresentation } from '../../src/server/engineering/drawing-presentation';
import { printSnapshot } from '../../src/workspace/PrintView';
import { loadFlangeCases } from '../reference/flange-cases';
import type { WorkResult } from '../../src/legacy/contracts';
vi.mock('server-only', () => ({}));

const catalog = await loadCatalog(resolve('private/catalog'));
const initial = () => createInitialState({ name: 'en-US', decimalSeparator: '.', groupSeparator: ',' });
const flange = () => transition(initial(), { type: 'select-route', routeId: 'Flan1' }, catalog);

test('verified focus retains independent flange commands and print snapshot isolation',()=>{
  const reference=loadFlangeCases('Flan1')[0];
  const view=structuredClone(reference.expected.view);
  const result=toPublicWorkResult('profile-fidelity',{state:{routeId:'Flan1',revision:1},view,trace:[],evidenceIds:[]} as unknown as WorkResult);
  expect(result.view.presentation?.primaryCommandIndices).toEqual([
    ...Array.from({length:108},(_,i)=>i),...Array.from({length:149},(_,i)=>i+144),
  ]);
  expect(result.view.drawing).toEqual(reference.expected.view.drawing);
  const snapshot=printSnapshot(result);
  result.view.presentation!.primaryCommandIndices.length=0;
  expect(snapshot.view.presentation?.primaryCommandIndices.length).toBe(257);
  expect(snapshot.view.drawing).toEqual(reference.expected.view.drawing);
});

// Omitting annotations/masks or including the distant auxiliary view must fail.
test('primary_group_contains_geometry_and_all_associated_dimensions', () => {
  const result = flange();
  const dto = toPublicWorkResult('focus-test', result, catalog);
  const indices = dto.view.presentation?.primaryCommandIndices;
  expect(indices).toBeDefined();
  const selected = new Set(indices);
  const drawing = dto.view.drawing;
  for (const [i, command] of drawing.commands.entries()) {
    if (command.op !== 'line') expect(selected.has(i)).toBe(true);
    if (command.op === 'line' && Math.max(command.from.x, command.to.x) > 1800) expect(selected.has(i)).toBe(false);
    if (command.op === 'line' && Math.min(command.from.x, command.to.x) < 0) expect(selected.has(i)).toBe(false);
  }
  expect(indices!.length).toBeGreaterThan(200);
  expect(indices!.length).toBeLessThan(drawing.commands.length);
  expect(new Set(indices).size).toBe(indices!.length);
  expect(indices!.every(i => Number.isInteger(i) && i >= 0 && i < drawing.commands.length)).toBe(true);
});

test('presentation_projection_preserves_commands', () => {
  for (const routeId of ['Flan1', 'Fxly1']) {
    const result = transition(initial(), { type: 'select-route', routeId }, catalog);
    const before = structuredClone(result);
    const dto = toPublicWorkResult('focus-test', result, catalog);
    expect(dto.view.presentation?.primaryCommandIndices.length).toBeGreaterThan(0);
    expect(dto.view.drawing).toEqual(before.view.drawing);
    expect(result).toEqual(before);
    expect(parsePublicWorkResult(dto)).toEqual(dto);
    expect(JSON.stringify(dto.view.presentation)).not.toMatch(/sourceHash|template|sourceRefs|private|profile/);
  }
});

test('unknown_or_changed_template_falls_back_to_overview', () => {
  const result = flange();
  const line = result.view.drawing.commands.find(c => c.op === 'line');
  if (!line || line.op !== 'line') throw new Error('Expected flange geometry');
  line.from.x += 1;
  expect(toPublicWorkResult('changed', result, catalog).view.presentation).toBeUndefined();
  const unknown = transition(initial(), { type: 'select-route', routeId: 'Gflt1' }, catalog);
  expect(toPublicWorkResult('unknown', unknown, catalog).view.presentation).toBeUndefined();
  const empty = flange();
  empty.view.drawing.commands = [];
  expect(toPublicWorkResult('empty', empty, catalog).view.presentation).toBeUndefined();
});

test('normal unit and size changes retain verified grouping without changing values', () => {
  let result = flange();
  for (const action of [
    { type: 'select-option', controlId: 'MainSize', value: '8' },
    { type: 'configure', units: 'Imperial', listUnits: 'Inches', temperature: 'Fahrenheit', fractions: true },
  ] as const) {
    result = transition(result.state, action, catalog);
    const before = structuredClone(result.view);
    const dto = toPublicWorkResult('units', result, catalog);
    expect(dto.view.presentation?.primaryCommandIndices.length).toBeGreaterThan(200);
    expect(dto.view.drawing).toEqual(before.drawing);
    expect(dto.view.textResults).toEqual(before.textResults);
  }
});

test('profile identity rejects changed masks, labels, ordering and appended geometry', () => {
  const original = flange().view.drawing;
  for (const mutate of [
    (d: typeof original) => { const c=d.commands[18]; if(c.op==='fillRect')c.width+=1; },
    (d: typeof original) => { const c=d.commands[0]; if(c.op==='fillRect')c.x+=1; },
    (d: typeof original) => { const c=d.commands[1]; if(c.op==='text')c.x+=1; },
    (d: typeof original) => { [d.commands[28],d.commands[29]]=[d.commands[29],d.commands[28]]; },
    (d: typeof original) => { d.commands.push(structuredClone(d.commands[28])); },
  ]) {
    const changed=structuredClone(original);mutate(changed);
    expect(drawingPresentation('Flan1',changed)).toBeUndefined();
  }
  for(const routeId of ['Gflt1','Span1','Flan2','Flan1a','__proto__','toString'])expect(drawingPresentation(routeId,original)).toBeUndefined();
});

test('opposite-temperature flexibility template falls back without losing its drawing', () => {
  let result=transition(initial(),{type:'select-route',routeId:'Fxly1'},catalog);
  result=transition(result.state,{type:'input',fieldId:'DesTemp',raw:'10'},catalog);
  const dto=toPublicWorkResult('variant',result,catalog);
  expect(dto.view.drawing.commands.length).toBeGreaterThan(100);
  expect(dto.view.presentation).toBeUndefined();
  expect(dto.view.drawing).toEqual(result.view.drawing);
});
