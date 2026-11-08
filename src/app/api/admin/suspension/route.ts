import { AdministrationDenied, requireAdmin, setSuspension } from '../../../../server/admin/service';
import { BrowserMutationDenied, requireBrowserMutation } from '../../../../server/security/browser-mutation';

export async function POST(request: Request) {
  const headers = { 'cache-control': 'no-store' };
  try {
    const actor = await requireAdmin(request);
    await requireBrowserMutation(request, actor);
    const data = await request.json().catch(() => null);
    if (!data || typeof data !== 'object' || Object.keys(data).length !== 2 ||
        typeof data.userId !== 'string' || !data.userId || data.userId.length > 128 ||
        typeof data.suspended !== 'boolean') {
      return Response.json({ reason: 'invalid-suspension' }, { status: 400, headers });
    }
    await setSuspension(actor.userId, data.userId, data.suspended);
    return new Response(null, { status: 204, headers });
  } catch (error) {
    if (error instanceof AdministrationDenied || error instanceof BrowserMutationDenied) {
      return Response.json({ reason: 'request-denied' }, { status: 403, headers });
    }
    throw error;
  }
}
