import { engineeringPolicy, privateWorkspaceHeaders as headers } from '../../../../../server/engineering/access';
import { readWorkspaceBody, workspaceFailure } from '../../../../../server/engineering/workspace-http';
import { workspaceRuntime } from '../../../../../server/engineering/workspace-runtime';
import { parseWorkspaceAssetBinding } from '../../../../../workspace/asset-transport';


export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const binding = parseWorkspaceAssetBinding(request.headers);
  if (!binding) return Response.json({ reason: 'invalid-binding' }, { status: 400, headers });
  try {
    const principal = await engineeringPolicy.requireMutation(request);
    const operation = await readWorkspaceBody(request);
    const { id } = await params;
    const { dispatchWorkspaceAction, response } = await workspaceRuntime();
    const { workspace, result } = await dispatchWorkspaceAction(principal, id, binding, operation);
    return response(workspace, 200, result);
  } catch (error) {
    return workspaceFailure(error);
  }
}
