import type { CoverageIndex, CoverageIssue, ParityCard } from './types';
export function requiredRoutes(index: CoverageIndex): string[] {
  return [...new Set([...index.dispatch, ...index.search, ...index.uiRoutes, ...index.dialogs].map(r => r.id).concat(index.events.map(e => `event:${e.controlId}:${e.event}`)))].sort();
}
export function checkCoverage(index: CoverageIndex, ledger: ParityCard[]): CoverageIssue[] {
  const issues: CoverageIssue[] = [];
  const required = new Set(requiredRoutes(index));
  const seen = new Set<string>();
  for (const routeId of required) {
    if (!ledger.some(card => card.routeId === routeId && card.elementId === 'functional')) issues.push({ code: 'missing-route', routeId, message: 'Required functional card missing from the ledger' });
  }
  const hashes = new Map(index.sources.map(ref => [ref.path, ref.hash]));
  for (const card of ledger) {
    const issue = (code: CoverageIssue['code'], message: string) => issues.push({ code, routeId: card.routeId, message });
    if (seen.has(card.id)) issue('duplicate-card', 'Card id must be unique');
    seen.add(card.id);
    if (!required.has(card.routeId) || !card.conditions.length || !['observed-static', 'confirmed-helper', 'observed-runtime', 'unresolved'].includes(card.level) || !['pending', 'passed', 'unverified-visual-nonblocking'].includes(card.verification)) issue('invalid-card', 'Unknown route, evidence status or missing conditions');
    if (!card.sourceRefs.length || card.sourceRefs.some(ref => !hashes.has(ref.path) || hashes.get(ref.path) !== ref.hash || !Number.isInteger(ref.line) || (ref.line ?? 0) <= 0 || (ref.endLine !== undefined && (!Number.isInteger(ref.endLine) || ref.endLine < ref.line!)))) issue('missing-evidence', 'Require hash-bound source coordinates');
    if (card.elementId === 'functional' && (card.verification !== 'passed' || card.level === 'unresolved' || !card.testIds.length || card.gaps.length)) issue('pending-functional', 'Required behavior needs passing independent tests and resolved functional gaps');
  }
  return issues;
}
