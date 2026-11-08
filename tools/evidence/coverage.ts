import { statSync } from 'node:fs';
import sourceIndex from '../../evidence/route-index.json';
import parityLedger from '../../evidence/parity-ledger.json';
import drawingEvidence from '../../evidence/drawing-compatibility.json';
import { allRoutes, allRouteRegistry } from '../../src/legacy/features';
import ui from '../../src/legacy/ui/source-data.json';
import { checkCoverage, requiredRoutes } from './check';
import type { ParityCard } from './types';
import type { FeatureRoute } from '../../src/legacy/contracts';
import type { CoverageIndex,CoverageIssue } from './types';

/** Completion must describe the actual assembled implementations, not only cards. */
export function checkAssemblyCoverage(index:CoverageIndex,routes:FeatureRoute[],handledEvents:readonly string[]):CoverageIssue[]{
  const issues:CoverageIssue[]=[],seen=new Set<string>(),required=new Set(index.dispatch.map(r=>r.id));
  for(const route of routes){
    if(!required.has(route.id)||seen.has(route.id)||typeof route.apply!=='function')issues.push({code:'invalid-card',routeId:route.id,message:'Invalid assembled route'});
    seen.add(route.id);
  }
  for(const id of required)if(!seen.has(id))issues.push({code:'missing-route',routeId:id,message:'Dispatch implementation is absent from the assembled registry'});
  const handled=new Set(handledEvents);
  for(const event of index.events){const id=`event:${event.controlId}:${event.event}`;
    if(!handled.has(id))issues.push({code:'missing-route',routeId:id,message:'Wired UI action has no classified handler'});
  }
  return issues;
}

export type CoverageReport = {
  sourceRevision: CoverageIndex['artifact'];
  requiredRoutes: string[];
  implementedRoutes: string[];
  testedBranches: { cardId: string; conditions: string[]; testIds: string[] }[];
  functionalGaps: CoverageIssue[];
  visualWaivers: string[];
};

export function checkFunctionalCoverage(index = sourceIndex as CoverageIndex, ledger = parityLedger as ParityCard[]): CoverageReport {
  const functionalGaps = [
    ...checkCoverage(index, ledger),
    ...checkAssemblyCoverage(index, allRoutes, ui.events.map(event => event.id)),
  ];
  const dispatch = new Set(index.dispatch.map(route => route.id));
  const noDispatch = new Set([...index.searchOnly, ...index.uiRoutes.map(route => route.id).filter(id => !dispatch.has(id))]);
  for (const id of noDispatch) {
    if (allRouteRegistry.classify(id) !== 'no-dispatch') {
      functionalGaps.push({code:'missing-route', routeId:id, message:'Source entry requires no-dispatch behavior'});
    }
  }
  const references = new Map([...new Set(ledger.flatMap(card => card.testIds))].map(id =>
    [id, /^(tests|tools)\/(?!.*\.\.)[\w./-]+$/.test(id) && statSync(new URL('../../'+id, import.meta.url), {throwIfNoEntry:false})?.isFile()]));
  for (const card of ledger) {
    const missing = card.testIds.filter(id => !references.get(id));
    if (missing.length) {
      functionalGaps.push({code:'missing-evidence', routeId:card.routeId, message:'Missing test files for '+card.id+': '+missing.join(', ')});
    }
  }
  const failed = new Set(functionalGaps.map(issue => issue.routeId));
  return {
    sourceRevision: index.artifact,
    requiredRoutes: requiredRoutes(index),
    implementedRoutes: allRoutes.map(route => route.id).sort(),
    testedBranches: ledger.filter(card => card.verification === 'passed' && card.testIds.length && !failed.has(card.routeId))
      .map(card => ({cardId:card.id, conditions:card.conditions, testIds:card.testIds})),
    functionalGaps,
    visualWaivers: [drawingEvidence.visualVerification],
  };
}
