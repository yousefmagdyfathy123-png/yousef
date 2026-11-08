import { EngineeringAccessDenied, engineeringPolicy, privateWorkspaceHeaders as headers } from '../../../../server/engineering/access';
import { BrowserMutationDenied } from '../../../../server/security/browser-mutation';

export async function POST(request: Request) {
  try {
    const { access } = await engineeringPolicy.enter(request);
    const allowed = access.reason === 'trial' || access.reason === 'paid';
    const status = allowed ? 200 : access.reason === 'unauthenticated' ? 401 : 403;
    return Response.json(access, { status, headers });
  } catch (error) {
    if (error instanceof EngineeringAccessDenied) {
      return Response.json({ reason: error.reason }, { status: error.status, headers });
    }
    if (error instanceof BrowserMutationDenied) {
      return Response.json({ reason: 'request-denied' }, { status: 403, headers });
    }
    throw error;
  }
}
