import { getPrincipal } from '../../../../server/auth/principal';
import { BrowserMutationDenied, requireBrowserMutation } from '../../../../server/security/browser-mutation';
import { getOrCreateQuote } from '../../../../server/commerce/pricing';

export async function POST(request: Request) {
  const headers = { 'cache-control': 'no-store' };
  try {
    const principal = await getPrincipal(request);
    if (!principal) return Response.json({ reason: 'unauthenticated' }, { status: 401, headers });
    await requireBrowserMutation(request, principal);
    const { id, price } = await getOrCreateQuote(principal.userId);
    return Response.json({ id, price }, { headers });
  } catch (error) {
    if (error instanceof BrowserMutationDenied) return Response.json({ reason: 'request-denied' }, { status: 403, headers });
    throw error;
  }
}
