import { BrowserMutationDenied, issueBrowserMutationToken } from '../../../server/security/browser-mutation';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    return Response.json({ token: await issueBrowserMutationToken(request) }, { headers });
  } catch (error) {
    if (!(error instanceof BrowserMutationDenied)) throw error;
    return new Response(null, { status: 403, headers });
  }
}
