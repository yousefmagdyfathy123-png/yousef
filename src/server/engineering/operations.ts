import 'server-only';
import { createHash } from 'node:crypto';
import type { Catalog } from '../../legacy/contracts';
import { allRouteRegistry } from '../../legacy/features';
import routeIds from '../../legacy/route-ids.json';
import { transition } from '../../legacy/state/transition';
import { parsePublicWorkResult } from '../../shared/public-schemas';
import type { WorkspaceAssetBinding } from '../../workspace/asset-transport';
import type { Principal } from './access';
import { parseWorkspaceOperation, requireActionScope } from './actions';
import { toPublicWorkResult } from './public-result';
import { advanceWorkspaceUi } from './ui-state';
import { requireCurrentBinding, WorkspaceStoreError, type createWorkspaceStore } from './workspace-store';

const availableRoutes = new Set([
  ...routeIds.dispatch.filter(id => allRouteRegistry.classify(id) === 'implemented'),
  ...routeIds.noDispatch,
]);

export class WorkspaceOperationError extends Error {
  readonly status: number;

  constructor(readonly code: 'OPERATION_CONFLICT' | 'OPERATION_RESULT_EXPIRED') {
    super(code);
    this.status = code === 'OPERATION_RESULT_EXPIRED' ? 410 : 409;
  }
}

type Receipt = {
  operation_id: string;
  fingerprint: string;
  committed_revision: string;
  public_result: unknown;
};

export function createWorkspaceOperations(store: ReturnType<typeof createWorkspaceStore>, catalog: Catalog, execute = transition) {
  async function dispatchWorkspaceAction(principal: Principal, id: string, binding: WorkspaceAssetBinding, raw: unknown) {
    const { operationId, operationSequence, expectedRevision, action } = parseWorkspaceOperation(raw);
    // Schema parsing supplies a stable property order independent of the request's JSON key order.
    const fingerprint = createHash('sha256').update(JSON.stringify([expectedRevision, action])).digest('hex');
    return store.withLockedWorkspace(principal, id, binding.tabId, async (client, workspace, commit) => {
      requireCurrentBinding(workspace, binding);
      if (operationSequence <= workspace.lastOperationSequence) {
        const { rows: [receipt] } = await client.query<Receipt>(`
          SELECT operation_id, fingerprint, committed_revision, public_result FROM workspace_operation_receipts
          WHERE workspace_id=$1 AND operation_sequence=$2
        `, [id, operationSequence]);
        if (!receipt) {
          if (operationSequence > workspace.lastOperationSequence - 100) throw new WorkspaceStoreError('workspace-incompatible');
          throw new WorkspaceOperationError('OPERATION_RESULT_EXPIRED');
        }
        if (receipt.operation_id !== operationId || receipt.fingerprint !== fingerprint) {
          throw new WorkspaceOperationError('OPERATION_CONFLICT');
        }
        try {
          const result = parsePublicWorkResult(receipt.public_result);
          if (result.workspaceId !== id || result.revision !== Number(receipt.committed_revision) ||
              result.revision !== expectedRevision + 1 || result.revision > workspace.revision) throw new Error();
          return { workspace, result };
        } catch {
          throw new WorkspaceStoreError('workspace-incompatible');
        }
      }

      if (operationSequence - 1 !== workspace.lastOperationSequence || expectedRevision !== workspace.revision) {
        throw new WorkspaceOperationError('OPERATION_CONFLICT');
      }
      const retained = await client.query(
        'SELECT 1 FROM workspace_operation_receipts WHERE workspace_id=$1 AND operation_id=$2', [id, operationId],
      );
      if (retained.rowCount) throw new WorkspaceOperationError('OPERATION_CONFLICT');

      const controls = workspace.state.legacySession!.lastView!.controls;
      requireActionScope(action, {
        routeIds: availableRoutes,
        controls,
        inputIds: new Set(controls.filter(control => control.type === 'input' && control.visible && control.enabled)
          .map(control => control.id)),
      });
      const transitionResult = execute(workspace.state, action, catalog);
      advanceWorkspaceUi(workspace.state, transitionResult);
      const result = toPublicWorkResult(id, transitionResult, catalog);
      const saved = await commit(expectedRevision, transitionResult.state, operationSequence);
      await client.query(`
        INSERT INTO workspace_operation_receipts
          (workspace_id, operation_sequence, operation_id, fingerprint, committed_revision, public_result)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [id, operationSequence, operationId, fingerprint, saved.revision, result]);
      if (operationSequence > 100) {
        await client.query('DELETE FROM workspace_operation_receipts WHERE workspace_id=$1 AND operation_sequence <= $2',
          [id, operationSequence - 100]);
      }
      return { workspace: saved, result };
    });
  };
  async function getOperationStatus(principal: Principal, id: string, binding: WorkspaceAssetBinding, raw: unknown) {
    const { operationId, operationSequence, expectedRevision, action } = parseWorkspaceOperation(raw);
    const fingerprint = createHash('sha256').update(JSON.stringify([expectedRevision, action])).digest('hex');
    try {
      return await store.withLockedWorkspace(principal, id, binding.tabId, async (client, workspace) => {
        requireCurrentBinding(workspace, binding);
        if (operationSequence <= workspace.lastOperationSequence) {
          const { rows: [receipt] } = await client.query<Receipt>(`
            SELECT operation_id, fingerprint, committed_revision, public_result FROM workspace_operation_receipts
            WHERE workspace_id=$1 AND operation_sequence=$2
          `, [id, operationSequence]);
          if (!receipt) {
            if (operationSequence > workspace.lastOperationSequence - 100) throw new WorkspaceStoreError('workspace-incompatible');
            return { kind: 'result-expired' } as const;
          }
          if (receipt.operation_id !== operationId || receipt.fingerprint !== fingerprint) return { kind: 'conflict' } as const;
          try {
            const result = parsePublicWorkResult(receipt.public_result);
            if (result.workspaceId !== id || result.revision !== Number(receipt.committed_revision) ||
                result.revision !== expectedRevision + 1 || result.revision > workspace.revision) throw new Error();
            return { kind: 'committed', result } as const;
          } catch {
            throw new WorkspaceStoreError('workspace-incompatible');
          }
        }
        if (operationSequence !== workspace.lastOperationSequence + 1 || expectedRevision !== workspace.revision) {
          return { kind: 'conflict' } as const;
        }
        const retained = await client.query(
          'SELECT 1 FROM workspace_operation_receipts WHERE workspace_id=$1 AND operation_id=$2', [id, operationId],
        );
        return retained.rowCount ? { kind: 'conflict' } as const : { kind: 'not-committed' } as const;
      }, 2000);
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === '55P03') return { kind: 'unknown' } as const;
      throw error;
    }
  }
  return Object.assign(dispatchWorkspaceAction, { getOperationStatus });
}
