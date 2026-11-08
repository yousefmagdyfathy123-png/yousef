import { engineeringPolicy, privateWorkspaceHeaders as headers } from '../../../../../../server/engineering/access';
import { readWorkspaceBody, workspaceFailure } from '../../../../../../server/engineering/workspace-http';
import { workspaceRuntime } from '../../../../../../server/engineering/workspace-runtime';
import { parseWorkspaceAssetBinding } from '../../../../../../workspace/asset-transport';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const binding = parseWorkspaceAssetBinding(request.headers);
  if (!binding) return Response.json({ reason: 'invalid-binding' }, { status: 400, headers });
  try {
    const principal = await engineeringPolicy.requireMutation(request);
    const { id } = await params;
    const operation = await readWorkspaceBody(request);
    const { dispatchWorkspaceAction } = await workspaceRuntime();
    return Response.json(await dispatchWorkspaceAction.getOperationStatus(principal, id, binding, operation), { headers });
  } catch (error) {
    return workspaceFailure(error);
  }
}
