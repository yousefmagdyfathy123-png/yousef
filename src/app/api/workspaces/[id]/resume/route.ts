import { engineeringPolicy } from '../../../../../server/engineering/access';
import { readWorkspaceBody, workspaceFailure } from '../../../../../server/engineering/workspace-http';
import { workspaceRuntime } from '../../../../../server/engineering/workspace-runtime';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const principal = await engineeringPolicy.requireMutation(request);
    const { id } = await params;
    const body = await readWorkspaceBody(request);
    const { resumeWorkspace } = await workspaceRuntime();
    return await resumeWorkspace(principal, id, body);
  } catch (error) {
    return workspaceFailure(error);
  }
}
