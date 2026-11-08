import 'server-only';
import type { Catalog } from '../../legacy/contracts';
import { searchCatalog } from '../../legacy/state/search';
import { publicSearchHitSchema } from '../../shared/public-schemas';
import { searchContext } from '../../shared/search-context';
import type { WorkspaceAssetBinding } from '../../workspace/asset-transport';
import type { Principal } from './access';
import { InvalidWorkspaceAction } from './actions';
import { requireCurrentBinding, type createWorkspaceStore } from './workspace-store';

export function createWorkspaceSearch(store: ReturnType<typeof createWorkspaceStore>, catalog: Catalog) {
  return async function searchWorkspace(principal: Principal, id: string, binding: WorkspaceAssetBinding, raw: unknown) {
    if (!raw || typeof raw !== 'object' || Object.keys(raw).length !== 1 || !('query' in raw) ||
        typeof raw.query !== 'string' || raw.query.length > 1024) throw new InvalidWorkspaceAction();
    const query = raw.query;
    return store.withLockedWorkspace(principal, id, binding.tabId, async (_, workspace) => {
      requireCurrentBinding(workspace, binding);
      try {
        const hits = searchCatalog(query, catalog, workspace.state.culture);
        return { hits: hits.map(hit => publicSearchHitSchema.parse({ id: hit.id, text: hit.text, context: searchContext(hit.id) })) };
      } catch (error) {
        if (error instanceof Error && error.name === 'ArgumentException') throw new InvalidWorkspaceAction();
        throw error;
      }
    });
  };
}
