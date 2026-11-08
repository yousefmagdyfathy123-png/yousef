import { isDeepStrictEqual } from 'node:util';
import { checkAssemblyCoverage, checkFunctionalCoverage } from '../evidence/coverage';
import type { CoverageIndex, ParityCard } from '../evidence/types';
import type { FeatureRoute } from '../../src/legacy/contracts';
import sourceUi from '../../tests/reference/ui/source-ui.json';

export function checkAcceptanceCoverage(
  index: CoverageIndex,
  ledger: ParityCard[],
  routes: FeatureRoute[],
  events: typeof sourceUi.events,
) {
  const { functionalGaps } = checkFunctionalCoverage(index, ledger);
  const issues = [...functionalGaps, ...checkAssemblyCoverage(index, routes, events.map(event => event.id))];
  const sourceEvents = new Map(sourceUi.events.map(event => [event.id, event]));
  for (const event of events) {
    if (!isDeepStrictEqual(event, sourceEvents.get(event.id))) {
      issues.push({ code: 'invalid-card', routeId: event.id, message: 'UI handler differs from its source reference' });
    }
    sourceEvents.delete(event.id);
  }
  return issues;
}

export type ReferenceEvidence = {
  fixture: { path: string; hash: string; cases: number };
  extractor: string;
  actualHash: string;
  caseIds: string[];
  passingCaseIds: string[];
};

export function checkReferenceProvenance(reference: ReferenceEvidence): string[] {
  const { fixture, extractor, actualHash, caseIds, passingCaseIds } = reference;
  const issues: string[] = [];
  if (!/^tests\/reference\/calculators\/\w+\.json$/.test(fixture.path) ||
      extractor !== 'tools/evidence/calculators-reference.py' || fixture.hash !== actualHash) {
    issues.push('Recipe fixture must match its pinned source extraction');
  }
  const passing = new Set(passingCaseIds);
  if (!caseIds.length || fixture.cases !== caseIds.length || new Set(caseIds).size !== caseIds.length ||
      caseIds.some(id => !passing.has(id))) issues.push('Recipe fixture cases are missing passing test results');
  return issues;
}
