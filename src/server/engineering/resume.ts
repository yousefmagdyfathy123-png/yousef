import 'server-only';
import { createHash } from 'node:crypto';
import { isWorkspaceToken } from '../../workspace/asset-transport';
import type { Principal } from './access';
import { InvalidWorkspaceAction } from './actions';
import { WorkspaceStoreError, type createWorkspaceStore, type StoredWorkspace } from './workspace-store';

export function createWorkspaceResume<T>(store: ReturnType<typeof createWorkspaceStore>, project: (workspace: StoredWorkspace) => T) {
  return {
    getResumeInfo(principal: Principal, id: string) {
      return store.withOwnedWorkspace(principal, id, async (_, workspace) => ({
        bindingRevision: workspace.bindingRevision,
      }));
    },
    resumeWorkspace(principal: Principal, id: string, raw: unknown) {
      if (!raw || typeof raw !== 'object') throw new InvalidWorkspaceAction();
      const { tabId, expectedBindingRevision, resumeRequestId } = raw as Record<string, unknown>;
      if (Object.keys(raw).length !== 3 || !isWorkspaceToken(tabId) || !isWorkspaceToken(resumeRequestId) ||
          typeof expectedBindingRevision !== 'number' || !Number.isSafeInteger(expectedBindingRevision) ||
          expectedBindingRevision < 0) throw new InvalidWorkspaceAction();

      const fingerprint = createHash('sha256')
        .update(JSON.stringify([principal.sessionId, tabId, expectedBindingRevision])).digest('hex');

      return store.withOwnedWorkspace(principal, id, async (client, workspace, timestamp, lastResume) => {
        if (lastResume?.id === resumeRequestId) {
          if (lastResume.fingerprint === fingerprint && workspace.sessionId === principal.sessionId &&
              workspace.tabId === tabId) return project(workspace);
          throw new WorkspaceStoreError('workspace-conflict');
        }
        const bindingRevision = expectedBindingRevision + 1;
        if (workspace.bindingRevision !== expectedBindingRevision || !Number.isSafeInteger(bindingRevision)) {
          throw new WorkspaceStoreError('workspace-conflict');
        }
        await client.query(`
          UPDATE workspaces SET session_id=$2, tab_id=$3, binding_revision=$4, last_resume_request=$5,
            last_activity_at=$6, expires_at=$7 WHERE id=$1
        `, [id, principal.sessionId, tabId, bindingRevision, { id: resumeRequestId, fingerprint },
          timestamp.last_activity_at, timestamp.expires_at]);
        return project({ ...workspace, sessionId: principal.sessionId, tabId, bindingRevision,
          lastActivityAt: timestamp.last_activity_at, expiresAt: timestamp.expires_at });
      });
    },
  };
}
