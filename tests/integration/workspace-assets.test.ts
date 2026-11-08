import { expect, test, vi } from 'vitest';
import { fetchWorkspaceAsset, workspaceAssetHeaders } from '../../src/workspace/asset-transport';
import { EngineeringAccessDenied } from '../../src/server/engineering/access';
import { createWorkspaceAssetRoute, createWorkspaceAssetService } from '../../src/server/engineering/assets';

vi.mock('server-only', () => ({}));

const principal = { userId: 'owner', sessionId: 'session', emailVerified: true, suspended: false, role: 'user' } as const;
const binding = { tabId: 'tab-a', bindingRevision: 2, recoveryGeneration: 'generation-a' };
const origin = 'https://alfadata.example.invalid';

test('asset scope denies foreign, stale, expired and raw requests before rendering', async () => {
  const derive = vi.fn(async () => ({ body: new Blob(['derived']), contentType: 'image/png' as const }));
  const workspace = {
    id: 'workspace-a', userId: principal.userId, sessionId: principal.sessionId, ...binding,
    expiresAt: new Date('2027-01-01'), derivedAssets: new Map([['drawing', derive]]),
  };
  let allowed = true;
  const getAsset = createWorkspaceAssetService({
    load: async () => workspace, now: () => new Date('2026-11-03'),
    checkAccess: async () => { if (!allowed) throw new EngineeringAccessDenied('trial-expired'); },
  });

  for (const actor of [{ ...principal, userId: 'foreign' }, { ...principal, sessionId: 'foreign' }]) {
    await expect(getAsset(actor, workspace.id, 'drawing', binding)).rejects.toMatchObject({ status: 404 });
  }
  for (const stale of [
    { ...binding, tabId: 'tab-b' }, { ...binding, bindingRevision: 1 }, { ...binding, recoveryGeneration: 'old' },
  ]) {
    await expect(getAsset(principal, workspace.id, 'drawing', stale)).rejects.toMatchObject({ status: 404 });
  }
  await expect(getAsset(principal, 'other-workspace', 'drawing', binding)).rejects.toMatchObject({ status: 404 });
  for (const id of ['missing', '../Database', 'Pipedata.exe', '%2e%2e%2fDatabase', 'Database/raw']) {
    await expect(getAsset(principal, workspace.id, id, binding)).rejects.toMatchObject({ status: 404 });
  }
  workspace.expiresAt = new Date('2026-11-03');
  await expect(getAsset(principal, workspace.id, 'drawing', binding)).rejects.toMatchObject({ status: 404 });
  workspace.expiresAt = new Date('2027-01-01');
  allowed = false;
  await expect(getAsset(principal, workspace.id, 'drawing', binding)).rejects.toMatchObject({ status: 403 });
  expect(derive).not.toHaveBeenCalled();
  allowed = true;
  expect(await (await getAsset(principal, workspace.id, 'drawing', binding)).body.text()).toBe('derived');
  expect(derive).toHaveBeenCalledTimes(1);
});

test('nested GET validates binding headers and scopes the private response to verified auth', async () => {
  const getAsset = vi.fn(async () => ({ body: new Blob(['derived']), contentType: 'image/png' as const }));
  const route = createWorkspaceAssetRoute(async () => principal, getAsset);
  const params = Promise.resolve({ id: 'workspace-a', assetId: 'drawing' });
  const headers = new Headers({
    [workspaceAssetHeaders.tabId]: binding.tabId,
    [workspaceAssetHeaders.bindingRevision]: String(binding.bindingRevision),
    [workspaceAssetHeaders.recoveryGeneration]: binding.recoveryGeneration,
    'X-User-Id': 'forged', 'X-Session-Id': 'forged',
  });
  const request = (values: Headers) => new Request(origin + '/api/workspaces/workspace-a/assets/drawing', { headers: values });
  for (const [key, invalid] of [
    [workspaceAssetHeaders.tabId, '../tab'], [workspaceAssetHeaders.bindingRevision, '9007199254740992'],
    [workspaceAssetHeaders.recoveryGeneration, 'a,b'],
  ]) {
    const missing = new Headers(headers);
    missing.delete(key);
    expect((await route(request(missing), { params })).status).toBe(400);
    missing.set(key, invalid);
    expect((await route(request(missing), { params })).status).toBe(400);
  }
  expect(getAsset).not.toHaveBeenCalled();
  const response = await route(request(headers), { params });
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(response.headers.get('content-type')).toBe('image/png');
  expect(await response.text()).toBe('derived');
  expect(getAsset).toHaveBeenCalledExactlyOnceWith(principal, 'workspace-a', 'drawing', binding);
});

test('client sends only binding metadata to the nested route with shared caching disabled', async () => {
  const fetcher = vi.fn(async () => new Response());
  vi.stubGlobal('fetch', fetcher);
  try {
    await fetchWorkspaceAsset('workspace-a', 'drawing', binding);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/workspaces/workspace-a/assets/drawing', {
      cache: 'no-store', credentials: 'same-origin', headers: new Headers({
        [workspaceAssetHeaders.tabId]: binding.tabId,
        [workspaceAssetHeaders.bindingRevision]: String(binding.bindingRevision),
        [workspaceAssetHeaders.recoveryGeneration]: binding.recoveryGeneration,
      }),
    });
    expect(() => fetchWorkspaceAsset('workspace-a', '../Database', binding)).toThrow();
  } finally {
    vi.unstubAllGlobals();
  }
});
