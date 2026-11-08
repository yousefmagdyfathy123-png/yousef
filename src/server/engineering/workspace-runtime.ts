import 'server-only';
import { loadCatalog } from '../catalog';
import { assertEngineeringEntitlement, privateWorkspaceHeaders, WorkspaceNotFound, type Principal } from './access';
import type { AssetResponse, WorkspaceAssetBinding } from './assets';
import { toPublicWorkResult } from './public-result';
import { createWorkspaceStore, requireCurrentBinding, type StoredWorkspace } from './workspace-store';
import { createWorkspaceOperations } from './operations';
import { createWorkspaceResume } from './resume';
import { createWorkspaceSearch } from './search';
export { requireCurrentBinding } from './workspace-store';
import { isWorkspaceToken, workspaceBindingHeaders, workspaceOperationSequenceHeader } from '../../workspace/asset-transport';

let catalogPromise: ReturnType<typeof loadCatalog> | undefined;

export async function workspaceRuntime() {
  const [catalog, { db }, { getEntitlement }] = await Promise.all([
    catalogPromise ??= loadCatalog('private/catalog').catch(error => {
      catalogPromise = undefined;
      throw error;
    }),
    import('../db/pool'),
    import('../access/runtime'),
  ]);
  const store = createWorkspaceStore({
    database: db, catalog,
    checkAccess: async (principal, client) => assertEngineeringEntitlement(await getEntitlement(principal, client)),
  });
  function project(workspace: StoredWorkspace) {
    return toPublicWorkResult(workspace.id, {
      state: workspace.state, view: workspace.state.legacySession!.lastView!, trace: [], evidenceIds: [],
    }, catalog);
  }
  function response(workspace: StoredWorkspace, status = 200, result = project(workspace)) {
    const headers = workspaceBindingHeaders(workspace);
    for (const [name, value] of Object.entries(privateWorkspaceHeaders)) headers.set(name, value);
    headers.set(workspaceOperationSequenceHeader, String(workspace.lastOperationSequence));
    return Response.json(result, { status, headers });
  }
  return { store, project, response, ...createWorkspaceResume(store, response),
    dispatchWorkspaceAction: createWorkspaceOperations(store, catalog), searchWorkspace: createWorkspaceSearch(store, catalog) };
}


export async function readWorkspaceAsset(principal: Principal, id: string, assetId: string,
  binding: WorkspaceAssetBinding): Promise<AssetResponse> {
  if (!isWorkspaceToken(assetId) || assetId !== 'drawing') throw new WorkspaceNotFound();
  const { store, project } = await workspaceRuntime();
  return store.readWorkspace(principal, id, binding.tabId, workspace => {
    requireCurrentBinding(workspace, binding);
    const { drawing } = project(workspace).view;
    if (!drawing.commands.length) throw new WorkspaceNotFound();
    const contentType = 'application/json';
    return { body: new Blob([JSON.stringify(drawing)], { type: contentType }), contentType, revision: workspace.revision };
  });
}
