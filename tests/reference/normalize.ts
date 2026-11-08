import type { WorkResult } from '../../src/legacy/contracts';
export type ReferenceView = WorkResult;
// Exact projection, with no JSON round-trip, rounding, sorting or text cleanup.
// Only declared legacy state/view/trace and evidence fields enter comparisons;
// any future session identifiers/clocks at the envelope level are excluded.
export function normalizeView(result: WorkResult): ReferenceView {
  const { state, view } = result;
  return {
    state: { routeId:state.routeId,culture:state.culture,values:state.values,history:state.history,legacyBuffers:state.legacyBuffers,revision:state.revision,...(state.legacySession?{legacySession:state.legacySession}:{}) },
    view: { headers:view.headers,controls:view.controls,drawing:view.drawing,messages:view.messages,visibility:view.visibility,...(view.textResults?{textResults:view.textResults}:{}) },
    evidenceIds:result.evidenceIds,trace:result.trace,
    ...(result.searchHits?{searchHits:result.searchHits}:{}),
  };
}
