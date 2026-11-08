import { getPrincipal } from '../../../../server/auth/principal';
import { BrowserMutationDenied, requireBrowserMutation } from '../../../../server/security/browser-mutation';
import { DeletionUnavailable, requestAccountDeletion } from '../../../../server/account/deletion';

function reply(body: object, status: number) {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  const principal = await getPrincipal(request);
  if (!principal) return reply({ reason: 'unauthenticated' }, 401);
  try {
    await requireBrowserMutation(request, principal);
    const data = await request.json().catch(() => null);
    if (!data || typeof data !== 'object' || Object.keys(data).length !== 1 ||
        typeof data.password !== 'string' || !data.password || data.password.length > 1024) {
      return reply({ reason: 'invalid-confirmation' }, 400);
    }
    const { auth } = await import('../../../../server/auth/runtime');
    const verification = await auth.api.verifyPassword({
      headers: request.headers, body: { password: data.password }, asResponse: true,
    });
    if (!verification.ok || (await verification.json()).status !== true) return reply({ reason: 'reauthentication-failed' }, 403);
    const result = await requestAccountDeletion(principal);
    return reply({ requestedAt: result.requested_at, dueAt: result.due_at }, 202);
  } catch (error) {
    if (error instanceof BrowserMutationDenied) return reply({ reason: 'request-denied' }, 403);
    if (error instanceof DeletionUnavailable) return reply({ reason: 'deletion-unavailable' }, 503);
    throw error;
  }
}
