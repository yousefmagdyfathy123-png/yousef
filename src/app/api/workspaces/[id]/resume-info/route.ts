import { getPrincipal } from '../../../../../server/auth/principal';
import { EngineeringAccessDenied, privateWorkspaceHeaders as headers } from '../../../../../server/engineering/access';
import { workspaceFailure } from '../../../../../server/engineering/workspace-http';
import { workspaceRuntime } from '../../../../../server/engineering/workspace-runtime';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const principal = await getPrincipal(request);
    if (!principal) throw new EngineeringAccessDenied('unauthenticated');
    const { id } = await params;
    const { getResumeInfo } = await workspaceRuntime();
    return Response.json(await getResumeInfo(principal, id), { headers });
  } catch (error) {
    return workspaceFailure(error);
  }
}
