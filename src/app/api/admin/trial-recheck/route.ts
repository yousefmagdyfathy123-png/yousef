import { getPrincipal } from '../../../../server/auth/principal';
import { BrowserMutationDenied } from '../../../../server/security/browser-mutation';

export async function POST(request: Request) {
  const headers = { 'cache-control': 'no-store' };
  const denied = () => Response.json({ message: 'Trial recheck denied.' }, { status: 403, headers });
  const actor = await getPrincipal(request);
  if (!actor?.emailVerified || actor.role !== 'admin' || actor.suspended) return denied();
  try {
    const data = await request.json().catch(() => null);
    if (typeof data?.userId !== 'string' || !data.userId || data.userId.length > 128) {
      return Response.json({ message: 'A valid account identifier is required.' }, { status: 400, headers });
    }
    const { recheckTrial } = await import('../../../../server/access/runtime');
    const status = await recheckTrial(request, actor, data.userId);
    if (status === 'denied') return denied();
    const message = status === 'review' ? 'Trial access still requires review.' : 'Trial record reconciled.';
    return Response.json({ status, message }, { headers });
  } catch (error) {
    if (error instanceof BrowserMutationDenied) return denied();
    throw error;
  }
}
