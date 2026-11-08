import 'server-only';
import { BrowserMutationDenied } from '../security/browser-mutation';
import { EngineeringAccessDenied, privateWorkspaceHeaders as headers, WorkspaceNotFound } from './access';
import { WorkspaceStoreError } from './workspace-store';
import { InvalidWorkspaceAction } from './actions';
import { WorkspaceOperationError } from './operations';

export async function readWorkspaceBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new InvalidWorkspaceAction();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let text = '';
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return JSON.parse(text + decoder.decode());
      size += value.byteLength;
      if (size > 32 * 1024) throw new InvalidWorkspaceAction();
      text += decoder.decode(value, { stream: true });
    }
  } catch {
    void reader.cancel().catch(() => undefined);
    throw new InvalidWorkspaceAction();
  } finally {
    reader.releaseLock();
  }
}

export function workspaceFailure(error: unknown): Response {
  if (error instanceof EngineeringAccessDenied) return Response.json({ reason: error.reason }, { status: error.status, headers });
  if (error instanceof BrowserMutationDenied) return Response.json({ reason: 'request-denied' }, { status: 403, headers });
  if (error instanceof WorkspaceNotFound) return Response.json({ reason: 'workspace-not-found' }, { status: 404, headers });
  if (error instanceof InvalidWorkspaceAction) return Response.json({ reason: 'invalid-action' }, { status: 400, headers });
  if (error instanceof WorkspaceStoreError || error instanceof WorkspaceOperationError) return Response.json({ reason: error.code }, { status: error.status, headers });
  throw error;
}
