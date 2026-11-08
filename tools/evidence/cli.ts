import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { discoverCoverage } from './discover';
import { checkCoverage, requiredRoutes } from './check';
import type { CoverageIndex, ParityCard, SourceRef } from './types';
import { checkFunctionalCoverage } from './coverage';
const mode = process.argv[2];
if (!['discover', 'check', 'complete'].includes(mode)) throw new Error('Expected discover, check or complete');
const fresh = discoverCoverage(resolve(process.env.LEGACY_SOURCE_ROOT ?? '..'));
const indexPath = resolve('evidence/route-index.json');
const ledgerPath = resolve('evidence/parity-ledger.json');
const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
if (mode === 'discover') {
  mkdirSync('evidence', { recursive: true });
  const cards: ParityCard[] = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf8')) : [];
  const entries = [...fresh.dispatch, ...fresh.search, ...fresh.uiRoutes, ...fresh.dialogs];
  for (const routeId of requiredRoutes(fresh)) {
    if (cards.some(card => card.routeId === routeId && card.elementId === 'functional')) continue;
    let refs: SourceRef[] = entries.filter(r => r.id === routeId).flatMap(r => r.sourceRefs);
    const event = fresh.events.find(e => `event:${e.controlId}:${e.event}` === routeId);
    if (event) refs = event.sourceRefs;
    refs = [...new Map(refs.map(ref => [JSON.stringify(ref), ref])).values()];
    cards.push({ id: `${routeId}:functional`, routeId, elementId: 'functional', conditions: event?.conditions ?? ['All source-derived branches, unit combinations and prior-state transitions; fixtures pending.'], sourceRefs: refs, level: 'observed-static', testIds: [], verification: 'pending', gaps: [fresh.searchOnly.includes(routeId) ? 'Search-only behavior requires investigation; no direct dispatch or invented data.' : 'Implementation and independent functional tests pending.'] });
  }
  writeFileSync(indexPath, json(fresh));
  writeFileSync(ledgerPath, json(cards));
  console.log(JSON.stringify({ dispatch: fresh.dispatch.length, search: fresh.search.length, uiRoutes: fresh.uiRoutes.length, events: fresh.events.length, dialogs: fresh.dialogs.length, requiredCards: cards.length }));
} else {
  const saved: CoverageIndex = JSON.parse(readFileSync(indexPath, 'utf8'));
  if (json(saved) !== json(fresh)) throw new Error('Source coverage drift: investigate and regenerate the evidence index');
  const ledger: ParityCard[] = JSON.parse(readFileSync(ledgerPath, 'utf8'));
  const report = mode === 'complete' ? checkFunctionalCoverage(fresh, ledger) : undefined;
  const issues = report?.functionalGaps ?? checkCoverage(fresh, ledger);
  const blocking = mode === 'complete' ? issues : issues.filter(i => i.code !== 'pending-functional');
  console.log(JSON.stringify({ mode, cards: ledger.length, sourceRevision: report?.sourceRevision, requiredRoutes: report?.requiredRoutes.length, implementedRoutes: report?.implementedRoutes.length, testedCards: report?.testedBranches.length, visualWaivers: report?.visualWaivers, pendingFunctional: issues.filter(i => i.code === 'pending-functional').length, blocking: blocking.length, examples: blocking.slice(0, 5) }, null, 2));
  if (blocking.length) process.exitCode = 1;
}
