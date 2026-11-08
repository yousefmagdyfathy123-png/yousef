export type WorkspaceAssetBinding = {
  tabId: string;
  bindingRevision: number;
  recoveryGeneration: string;
};

export const workspaceAssetHeaders = {
  tabId: 'X-Workspace-Tab-Id',
  bindingRevision: 'X-Workspace-Binding-Revision',
  recoveryGeneration: 'X-Recovery-Generation',
} as const;

export const workspaceOperationSequenceHeader = 'X-Workspace-Operation-Sequence';

export function isWorkspaceToken(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= 128 && !/[^A-Za-z0-9_-]/.test(value);
}

export function parseWorkspaceAssetBinding(headers: Headers): WorkspaceAssetBinding | null {
  const tabId = headers.get(workspaceAssetHeaders.tabId);
  const revision = headers.get(workspaceAssetHeaders.bindingRevision);
  const recoveryGeneration = headers.get(workspaceAssetHeaders.recoveryGeneration);
  if (!isWorkspaceToken(tabId) || !isWorkspaceToken(recoveryGeneration) ||
      revision === null || !/^(0|[1-9][0-9]{0,15})$/.test(revision)) return null;
  const bindingRevision = Number(revision);
  if (!Number.isSafeInteger(bindingRevision)) return null;
  return { tabId, bindingRevision, recoveryGeneration };
}

export function workspaceBindingHeaders(binding: WorkspaceAssetBinding) {
  const headers = new Headers({
    [workspaceAssetHeaders.tabId]: binding.tabId,
    [workspaceAssetHeaders.bindingRevision]: String(binding.bindingRevision),
    [workspaceAssetHeaders.recoveryGeneration]: binding.recoveryGeneration,
  });
  if (!parseWorkspaceAssetBinding(headers)) throw new Error('Invalid workspace asset binding');
  return headers;
}

export function fetchWorkspaceAsset(workspaceId: string, assetId: string, binding: WorkspaceAssetBinding, signal?: AbortSignal) {
  if (!isWorkspaceToken(workspaceId) || !isWorkspaceToken(assetId)) throw new Error('Invalid workspace asset identifier');
  return fetch(`/api/workspaces/${workspaceId}/assets/${assetId}`, {
    headers: workspaceBindingHeaders(binding), cache: 'no-store', credentials: 'same-origin',
    ...(signal && { signal }),
  });
}
