import { describe, expect, test } from 'vitest';
import { resolve } from 'node:path';
import { discoverCoverage } from '../../tools/evidence/discover';
import { checkCoverage } from '../../tools/evidence/check';
import type { ParityCard } from '../../tools/evidence/types';
const root = resolve(process.env.LEGACY_SOURCE_ROOT ?? '..');
describe('independent source coverage baseline', () => {
  test('extracts all 167 exact dispatch cases and accounts for all 169 search rows', () => {
    const index = discoverCoverage(root);
    expect(index.dispatch).toHaveLength(167);
    expect(index.search).toHaveLength(169);
    expect(new Set(index.search.map(r => r.id)).size).toBe(169);
    expect(index.searchOnly).toEqual(['Blnd1', 'Blnd2', 'Blnd3', 'Blnd4', 'Fl6b3']);
    expect(index.dispatchNotInSearch).toEqual(['Comp1', 'Piwt1', 'Psiz1']);
    for (const id of ['Comp1', 'Piwt1', 'Psiz1']) expect(index.uiRoutes.some(r => r.id === id)).toBe(true);
    expect(index.menuEdges.find(e => e.parent === 'mnuFlanges')?.children).toEqual([
      'FlangeTab1', 'FlangeTab2', 'FlangeTab3', 'FlangeTab4', 'FlangeTab5', 'FlangeTab6',
      'FlangeTab7', 'FlangeTab8', 'FlangeTab10', 'FlangeTab9', 'FlangeTab11',
    ]);
    expect(index.events.some(e => e.handler === 'mnuPipeSize_Click' && e.routeIds.includes('Psiz1'))).toBe(true);
    expect(index.dialogs.some(d => d.id === 'dialog:frmParameters')).toBe(true);
    expect(index.dialogs.some(d => d.id === 'dialog:frmConfigs')).toBe(true);
    expect(index.exclusions.some(e => e.id === 'ToolStripComboBox6')).toBe(true);
    expect(index.events.some(e => e.controlId === 'ToolStripComboBox6')).toBe(false);
    for (const event of ['Activated', 'Click', 'FormClosing', 'Load', 'Paint', 'Resize', 'SizeChanged']) {
      expect(index.events.some(e => e.controlId === '$form' && e.event === event)).toBe(true);
    }
    expect(index.recipes).toHaveLength(167);
  },30000);
  test('missing a required route cannot silently shrink the denominator', () => {
    const index = discoverCoverage(root);
    const cards: ParityCard[] = index.dispatch.filter(r => r.id !== 'Flan1').map(r => ({
      id: r.id, routeId: r.id, elementId: 'functional', conditions: ['all source branches'],
      sourceRefs: r.sourceRefs, level: 'observed-static', testIds: ['reference:pending'], verification: 'passed', gaps: [],
    }));
    expect(checkCoverage(index, cards)).toContainEqual(expect.objectContaining({ code: 'missing-route', routeId: 'Flan1' }));
  },30000);
  test('pending, unresolved, empty provenance and visual waivers cannot pass functional coverage', () => {
    const index = discoverCoverage(root);
    const card: ParityCard = { id: 'Flan1', routeId: 'Flan1', elementId: 'functional', conditions: [], sourceRefs: [], level: 'unresolved', testIds: [], verification: 'unverified-visual-nonblocking', gaps: ['not implemented'] };
    expect(checkCoverage(index, [card])).toContainEqual(expect.objectContaining({ code: 'pending-functional', routeId: 'Flan1' }));
    expect(checkCoverage(index, [card])).toContainEqual(expect.objectContaining({ code: 'missing-evidence', routeId: 'Flan1' }));
  },30000);
  test('malformed coordinates or unknown evidence levels cannot certify a route', () => {
    const index = discoverCoverage(root);
    const route = index.dispatch.find(r => r.id === 'Flan1')!;
    const card: ParityCard = { id: 'Flan1', routeId: 'Flan1', elementId: 'functional', conditions: ['Metric default'], sourceRefs: route.sourceRefs, level: 'observed-static', testIds: ['tests/reference/flan1.test.ts:metric-default'], verification: 'passed', gaps: [] };
    expect(checkCoverage(index, [card]).some(i => i.routeId === 'Flan1')).toBe(false);
    for (const line of [-1, 1.5, 0]) {
      const invalid = { ...card, sourceRefs: [{ ...route.sourceRefs[0], line }] };
      expect(checkCoverage(index, [invalid]).some(i => i.code === 'missing-evidence' && i.routeId === 'Flan1')).toBe(true);
    }
    const invalid = { ...card, level: 'invented' } as unknown as ParityCard;
    expect(checkCoverage(index, [invalid]).some(i => i.code === 'invalid-card' && i.routeId === 'Flan1')).toBe(true);
  },30000);
});
