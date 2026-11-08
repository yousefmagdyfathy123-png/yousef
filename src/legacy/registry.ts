import type { FeatureRoute } from './contracts';
import ids from './route-ids.json';
export interface RouteRegistry { classify(id: string): 'implemented' | 'pending' | 'no-dispatch' | 'unknown'; get(id: string): FeatureRoute | undefined }
const required = new Set(ids.dispatch), noDispatch = new Set(ids.noDispatch);
export function registerRoutes(routes: FeatureRoute[]): RouteRegistry {
  const map = new Map<string, FeatureRoute>();
  for (const route of routes) {
    if (!required.has(route.id) || map.has(route.id) || typeof route.apply !== 'function') throw new Error('Invalid or duplicate engineering route registration');
    map.set(route.id, Object.freeze({ id: route.id, apply: route.apply }));
  }
  return Object.freeze({ classify(id: string) { return map.has(id) ? 'implemented' : required.has(id) ? 'pending' : noDispatch.has(id) ? 'no-dispatch' : 'unknown'; }, get: (id: string) => map.get(id) });
}
