import { AdministrationDenied, requireAdmin } from '../../../../server/admin/service';
import { reviewDeletion } from '../../../../server/account/deletion';
import { BrowserMutationDenied, requireBrowserMutation } from '../../../../server/security/browser-mutation';

export async function POST(request: Request) {
  const headers = { 'cache-control': 'no-store' };
  try {
    const actor = await requireAdmin(request);
    await requireBrowserMutation(request, actor);
    const data = await request.json().catch(() => null);
    if (!data || Object.keys(data).length !== 1 || typeof data.requestId !== 'string' ||
        !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(data.requestId)) {
      return Response.json({ reason: 'invalid-deletion-request' }, { status: 400, headers });
    }
    if (!await reviewDeletion(actor, data.requestId)) {
      return Response.json({ reason: 'review-unavailable' }, { status: 409, headers });
    }
    return new Response(null, { status: 204, headers });
  } catch (error) {
    if (error instanceof AdministrationDenied || error instanceof BrowserMutationDenied) {
      return Response.json({ reason: 'request-denied' }, { status: 403, headers });
    }
    throw error;
  }
}
