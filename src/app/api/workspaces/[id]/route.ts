import { getPrincipal } from '../../../../server/auth/principal';
import { EngineeringAccessDenied, privateWorkspaceHeaders as headers } from '../../../../server/engineering/access';
import { workspaceFailure } from '../../../../server/engineering/workspace-http';
import { requireCurrentBinding, workspaceRuntime } from '../../../../server/engineering/workspace-runtime';
import { parseWorkspaceAssetBinding } from '../../../../workspace/asset-transport';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const binding = parseWorkspaceAssetBinding(request.headers);
  if (!binding) return Response.json({ reason: 'invalid-binding' }, { status: 400, headers });
  try {
    const principal = await getPrincipal(request);
    if (!principal) throw new EngineeringAccessDenied('unauthenticated');
    const { id } = await params;
    const { store, response } = await workspaceRuntime();
    return await store.readWorkspace(principal, id, binding.tabId, workspace => {
      requireCurrentBinding(workspace, binding);
      return response(workspace);
    });
  } catch (error) {
    return workspaceFailure(error);
  }
}
