import { expect, test } from 'vitest';
import { engineeringControlLabel } from '../../src/workspace/control-labels';

test.each([
  ['Flan1', 'MainSize', 'Size'], ['Flan1', 'ASMEClass', 'ASME Class'],
  ['Flan1', 'Face', 'Face Type'], ['Pipe1', 'Sch', 'Schedule'],
  ['Fxly1', 'Material', 'Material'], ['Fxly1', 'AmbTemp', 'Ambient Temperature'],
  ['Fxly1', 'DesTemp', 'Design Temperature'], ['Fldi2', 'DinClass', 'Pressure rating (PN)'],
])('%s %s has a verified readable label', (route, control, label) => {
  expect(engineeringControlLabel(route, control)).toBe(label);
});

test('the same Length identifier describes different verified calculator inputs by route', () => {
  expect(engineeringControlLabel('Fxly1', 'Length')).toBe('Length to anchor');
  expect(engineeringControlLabel('Fxly2', 'Length')).toBe('Length between anchors');
  expect(engineeringControlLabel('Unknown', 'Length')).toBe('Length');
  expect(engineeringControlLabel('Fxly20', 'Length')).toBe('Length');
});

test('unknown identifiers retain the existing identifier fallback without guessing a meaning', () => {
  expect(engineeringControlLabel('Flan1', 'UnknownField')).toBe('UnknownField');
  expect(engineeringControlLabel('constructor', 'constructor')).toBe('constructor');
  expect(engineeringControlLabel('Fxly1', 'toString')).toBe('toString');
});
