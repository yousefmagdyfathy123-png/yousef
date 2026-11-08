import { expect, test } from 'vitest';
import index from '../../evidence/route-index.json';
import ledger from '../../evidence/parity-ledger.json';
import { allRoutes } from '../../src/legacy/features';
import ui from '../../src/legacy/ui/source-data.json';
import { checkAcceptanceCoverage, checkReferenceProvenance, type ReferenceEvidence } from '../../tools/release/coverage';
import type { CoverageIndex, ParityCard } from '../../tools/evidence/types';

const cards = ledger as ParityCard[];
const inspect = (routes = allRoutes, events = ui.events, parity = cards) =>
  checkAcceptanceCoverage(index as CoverageIndex, parity, routes, events);

test('the pinned denominator has no gaps', () => expect(inspect()).toEqual([]));

test('a missing route and fabricated Blnd dispatch fail', () => {
  expect(inspect(allRoutes.slice(1))).toContainEqual(expect.objectContaining({ code: 'missing-route' }));
  expect(inspect([...allRoutes, { ...allRoutes[0], id: 'Blnd1' }]))
    .toContainEqual(expect.objectContaining({ routeId: 'Blnd1' }));
});

test('a missing recipe card and an unsupported action reported as success fail', () => {
  expect(inspect(allRoutes, ui.events, cards.filter(card => card.routeId !== 'Gpas1')))
    .toContainEqual(expect.objectContaining({ routeId: 'Gpas1' }));
  const event = ui.events.find(item => item.action.kind === 'vendor-link')!;
  expect(inspect(allRoutes, ui.events.map(item => item === event ? { ...item, action: { kind: 'empty' } } : item)))
    .toContainEqual(expect.objectContaining({ routeId: event.id }));
});

test('an untested branch or self-generated recipe fixture fails provenance', () => {
  const reference: ReferenceEvidence = {
    fixture: { path: 'tests/reference/calculators/Gpas1.json', hash: 'abc', cases: 2 },
    extractor: 'tools/evidence/calculators-reference.py',
    actualHash: 'abc',
    caseIds: ['first', 'second'],
    passingCaseIds: ['first', 'second'],
  };
  expect(checkReferenceProvenance(reference)).toEqual([]);
  expect(checkReferenceProvenance({ ...reference, passingCaseIds: ['first'] })).not.toEqual([]);
  expect(checkReferenceProvenance({ ...reference, extractor: 'src/legacy/features/calculators/Gpas1.ts' })).not.toEqual([]);
});
