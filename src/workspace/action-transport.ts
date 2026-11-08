import type { PublicWorkAction, PublicWorkResult } from '../shared/public-contracts';
import { parsePublicWorkResult } from '../shared/public-schemas';
import { workspaceBindingHeaders, workspaceOperationSequenceHeader, type WorkspaceAssetBinding } from './asset-transport';
import { browserMutation } from './browser-request';
import { pendingOperation, type OperationEnvelope as Envelope } from './pending-operation';

export function readWorkspaceOperationSequence(headers: Headers): number {
  const value = headers.get(workspaceOperationSequenceHeader);
  if (!value || !/^(0|[1-9][0-9]{0,15})$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error('Invalid workspace operation sequence');
  }
  return Number(value);
}

export type WorkspaceActionOutcome = { kind: 'committed'; result: PublicWorkResult } | {
  kind: 'recovered';
  result: PublicWorkResult;
  reason: 'result-expired' | 'conflict' | 'advanced';
};

export function createWorkspaceActionTransport(id: string, binding: WorkspaceAssetBinding, sequence: number, revision: number,
  account: string, recovery = { delaysMs: [1000, 3000, 10000], timeoutMs: 10000 }) {
  const path = `/api/workspaces/${id}`;
  const storage = pendingOperation(account, id);
  let pending: Envelope | undefined;
  let quarantined = false;
  try {
    const saved = storage.load();
    pending = saved?.envelope;
    quarantined = Boolean(saved && saved.generation !== binding.recoveryGeneration);
  } catch {
    quarantined = true;
  }
  let recoverCurrent: 'result-expired' | 'conflict' | undefined;
  let busy = false;

  async function read(response: Response) {
    const result = parsePublicWorkResult(await response.json());
    const cursor = readWorkspaceOperationSequence(response.headers);
    if (result.workspaceId !== id || cursor < sequence || result.revision < revision) throw new Error('Invalid workspace response');
    return { result, cursor };
  }

  function accept(result: PublicWorkResult, cursor: number) {
    storage.clear();
    sequence = cursor;
    revision = result.revision;
    pending = undefined;
    recoverCurrent = undefined;
  }

  async function recover(): Promise<WorkspaceActionOutcome> {
    const response = await fetch(path, { headers: workspaceBindingHeaders(binding), cache: 'no-store',
      signal: AbortSignal.timeout(recovery.timeoutMs) });
    checkAccess(response);
    if (response.status === 410) throw new AccessDenied('This workspace has expired');
    if (!response.ok) throw new Error('Workspace recovery failed');
    const { result, cursor } = await read(response);
    const reason = recoverCurrent ?? 'advanced';
    accept(result, cursor);
    return { kind: 'recovered', result, reason };
  }

  function request(endpoint: string, operation: Envelope) {
    const headers = workspaceBindingHeaders(binding);
    headers.set('Content-Type', 'application/json');
    return browserMutation(path + endpoint, { method: 'POST', headers, body: JSON.stringify(operation),
      cache: 'no-store', signal: AbortSignal.timeout(recovery.timeoutMs) });
  }

  class AccessDenied extends Error {}

  function checkAccess(response: Response) {
    if ([401, 403, 404].includes(response.status)) throw new AccessDenied('Workspace access is unavailable');
  }

  async function send(operation: Envelope): Promise<WorkspaceActionOutcome> {
    const response = await request('/actions', operation);
    checkAccess(response);
    if (response.status === 410 && (await response.clone().json()).reason === 'workspace-expired') {
      throw new AccessDenied('This workspace has expired');
    }
    if (response.status === 400) {
      storage.clear();
      pending = undefined;
      throw new AccessDenied('Workspace action was rejected');
    }
    if (!response.ok) throw new Error('Workspace response unavailable');
    const { result, cursor } = await read(response);
    if (cursor < operation.operationSequence || result.revision !== operation.expectedRevision + 1) {
      throw new Error('Invalid operation result');
    }
    if (cursor !== operation.operationSequence) return recover();
    accept(result, cursor);
    return { kind: 'committed', result };
  }

  async function reconcile(operation: Envelope, delays: number[]): Promise<WorkspaceActionOutcome> {
    for (const delay of delays) {
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      try {
        const response = await request('/operations/status', operation);
        checkAccess(response);
        if (response.status === 410) throw new AccessDenied('This workspace has expired');
        if (!response.ok) continue;
        const status = await response.json();
        if (status.kind === 'not-committed') return await send(operation);
        if (['committed', 'result-expired', 'conflict'].includes(status.kind)) {
          if (status.kind === 'committed') {
            const result = parsePublicWorkResult(status.result);
            if (result.workspaceId !== id || result.revision !== operation.expectedRevision + 1) throw new Error('Invalid receipt');
            const outcome = await recover();
            return outcome.result.revision === result.revision ? { kind: 'committed', result: outcome.result } : outcome;
          }
          recoverCurrent = status.kind;
          return await recover();
        }
      } catch (error) {
        if (error instanceof AccessDenied) throw error;
      }
    }
    throw new Error('Workspace response unavailable');
  }

  async function run(operation?: Envelope): Promise<WorkspaceActionOutcome> {
    if (busy || quarantined) throw new Error('Workspace action requires recovery review');
    busy = true;
    try {
      if (operation) {
        try {
          storage.save(operation, binding.recoveryGeneration);
        } catch {
          throw new Error('Workspace recovery storage is unavailable');
        }
        pending = operation;
        try {
          return await send(operation);
        } catch (error) {
          if (error instanceof AccessDenied) throw error;
          return await reconcile(operation, recovery.delaysMs);
        }
      }
      if (recoverCurrent) return await recover();
      if (pending) return await reconcile(pending, [0, ...recovery.delaysMs.slice(1)]);
      throw new Error('No workspace operation to retry');
    } finally {
      busy = false;
    }
  }

  return {
    requiresReview: () => quarantined,
    needsAttention: () => Boolean(pending || recoverCurrent || quarantined),
    submit(action: PublicWorkAction) {
      if (pending || recoverCurrent || quarantined || !Number.isSafeInteger(sequence + 1)) throw new Error('Workspace operation unavailable');
      return run({
        operationId: crypto.randomUUID(), operationSequence: sequence + 1, expectedRevision: revision, action: structuredClone(action),
      });
    },
    retry: () => run(),
  };
}
