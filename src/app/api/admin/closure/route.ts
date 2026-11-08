import { AdministrationDenied, requireAdmin } from '../../../../server/admin/service';
import { announceClosure, ClosureDenied } from '../../../../server/account/closure';
import { BrowserMutationDenied, requireBrowserMutation } from '../../../../server/security/browser-mutation';

export async function POST(request: Request) {
  const headers = { 'cache-control': 'no-store' };
  try {
    const actor = await requireAdmin(request);
    await requireBrowserMutation(request, actor);
    if (process.env.CLOSURE_OPERATIONS_APPROVED !== 'yes') throw new ClosureDenied();
    const data = await request.json().catch(() => null);
    if (!data || Object.keys(data).length !== 1 || typeof data.shutdownAt !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/.test(data.shutdownAt)) {
      return Response.json({ reason: 'invalid-shutdown-date' }, { status: 400, headers });
    }
    const shutdownAt = new Date(data.shutdownAt);
    if (!Number.isFinite(shutdownAt.getTime()) || shutdownAt.toISOString() !== data.shutdownAt) {
      return Response.json({ reason: 'invalid-shutdown-date' }, { status: 400, headers });
    }
    await announceClosure(actor, shutdownAt);
    return new Response(null, { status: 204, headers });
  } catch (error) {
    if (error instanceof AdministrationDenied || error instanceof BrowserMutationDenied) {
      return Response.json({ reason: 'request-denied' }, { status: 403, headers });
    }
    if (error instanceof ClosureDenied) return Response.json({ reason: 'closure-unavailable' }, { status: 409, headers });
    throw error;
  }
}
