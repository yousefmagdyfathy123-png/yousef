import type { Catalog,WorkAction,WorkState,WorkResult } from '../contracts';
import type { RouteRegistry } from '../registry';
import { allRouteRegistry } from '../features';
import { transition as execute,replay as executeReplay } from './transition-core';

// Family error recovery imports the registry-independent core. Keeping the
// assembled default here makes both family-first and workspace-first imports safe.
export function transition(state:WorkState,action:WorkAction,catalog:Catalog,registry:RouteRegistry=allRouteRegistry):WorkResult{
  return execute(state,action,catalog,registry);
}
export function replay(initial:WorkState,actions:WorkAction[],catalog:Catalog,registry:RouteRegistry=allRouteRegistry):WorkResult{
  return executeReplay(initial,actions,catalog,registry);
}
