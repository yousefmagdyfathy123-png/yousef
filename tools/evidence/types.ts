export type SourceRef = { path: string; hash: string; line?: number; endLine?: number; evidenceId?: string; token?: string; rva?: number; resourceOffset?: number };
export type RouteEvidence = { id: string; sourceRefs: SourceRef[] };
export type UiEvent = { controlId: string; event: string; handler: string; menuPath: string[]; routeIds: string[]; conditions: string[]; sourceRefs: SourceRef[] };
export type CoverageIndex = {
  schemaVersion: 1; artifact: { path: string; hash: string; mvid: string };
  sources: SourceRef[]; dispatch: RouteEvidence[]; titles: RouteEvidence[];
  search: (RouteEvidence & { row: number })[]; searchOnly: string[]; dispatchNotInSearch: string[];
  uiRoutes: RouteEvidence[]; menuEdges: { parent: string; children: string[]; sourceRefs: SourceRef[] }[];
  events: UiEvent[]; dialogs: RouteEvidence[];
  exclusions: { id: string; reason: string; sourceRefs: SourceRef[] }[];
  recipes: { routeId: string; conditionalBranches: number; sourceRefs: SourceRef[] }[];
  gaps: string[];
};
export type ParityCard = {
  id: string; routeId: string; elementId: string; conditions: string[]; sourceRefs: SourceRef[];
  level: 'observed-static' | 'confirmed-helper' | 'observed-runtime' | 'unresolved';
  testIds: string[]; verification: 'pending' | 'passed' | 'unverified-visual-nonblocking'; gaps: string[];
};
export type CoverageIssue = { code: 'missing-route' | 'missing-evidence' | 'pending-functional' | 'invalid-card' | 'duplicate-card'; routeId: string; message: string };
