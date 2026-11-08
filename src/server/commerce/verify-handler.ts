import { getPrincipal } from '../auth/principal';
import { BrowserMutationDenied, requireBrowserMutation } from '../security/browser-mutation';
import type { createReconciliation } from './reconciliation';

async function hasBodyBytes(request: Request) {
  if (!request.body) return false;
  const reader = request.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return false;
      if (value.byteLength) {
        await reader.cancel();
        return true;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function verifyPaymentHandler(reconcile: ReturnType<typeof createReconciliation>['reconcileOrder'], {
  readPrincipal = getPrincipal, protect = requireBrowserMutation,
} = {}) {
  return async (request: Request, id: string) => {
    const respond = (body: object, status: number) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
    const principal = await readPrincipal(request);
    if (!principal) return respond({ kind: 'unauthenticated' }, 401);
    try {
      await protect(request, principal);
    } catch (error) {
      if (error instanceof BrowserMutationDenied) return respond({ kind: 'request-denied' }, 403);
      throw error;
    }
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return respond({ kind: 'not-found' }, 404);
    if (await hasBodyBytes(request)) return respond({ kind: 'unexpected-body' }, 400);
    const result = await reconcile(id, 'manual', principal.userId);
    const status = result.kind === 'not-found' ? 404 : result.kind === 'rate-limited' ? 429
      : result.kind === 'busy' ? 202 : 200;
    return respond(result, status);
  };
}
