import { engineeringPolicy, privateWorkspaceHeaders as headers } from '../../../server/engineering/access';
import { workspaceFailure } from '../../../server/engineering/workspace-http';
import { workspaceRuntime } from '../../../server/engineering/workspace-runtime';
import { isWorkspaceToken, workspaceAssetHeaders } from '../../../workspace/asset-transport';

export async function POST(request: Request) {
  const tabId = request.headers.get(workspaceAssetHeaders.tabId);
  if (!isWorkspaceToken(tabId)) return Response.json({ reason: 'invalid-tab' }, { status: 400, headers });
  try {
    const principal = await engineeringPolicy.requireEntry(request);
    const { store, response } = await workspaceRuntime();
    return response(await store.createWorkspace(principal, tabId), 201);
  } catch (error) {
    return workspaceFailure(error);
  }
}
