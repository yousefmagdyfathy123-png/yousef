import { afterEach, expect, test, vi } from 'vitest';
import { pendingOperation } from '../../src/workspace/pending-operation';
import { createWorkspaceActionTransport } from '../../src/workspace/action-transport';

const binding = { tabId: 'tab', bindingRevision: 0, recoveryGeneration: 'initial' };
const operation = { operationId: 'op', operationSequence: 1, expectedRevision: 1, action: { type: 'back' } } as const;

function storage() {
  const records = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => records.set(key, value),
    removeItem: (key: string) => records.delete(key),
  });
  return records;
}

afterEach(() => vi.unstubAllGlobals());

test('validates stored envelopes and separates account and workspace keys', () => {
  const records = storage();
  const pending = pendingOperation('owner', 'workspace');
  pending.save(operation, binding.recoveryGeneration);
  expect(pending.load()?.envelope).toEqual(operation);
  expect(pendingOperation('other', 'workspace').load()).toBeUndefined();
  expect(pendingOperation('owner', 'other').load()).toBeUndefined();
  records.set([...records.keys()][0], '{"version":2}');
  expect(() => pending.load()).toThrow();
  pending.clear();
  expect(pending.load()).toBeUndefined();
});

test('a generation change quarantines a pending operation before any request', async () => {
  storage();
  pendingOperation('owner', 'workspace').save(operation, 'initial');
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const transport = createWorkspaceActionTransport('workspace', { ...binding, recoveryGeneration: 'restored' }, 0, 1, 'owner');
  expect(transport.needsAttention()).toBe(true);
  await expect(transport.retry()).rejects.toThrow('recovery review');
  expect(fetch).not.toHaveBeenCalled();
});

test('an unavailable write prevents dispatch', async () => {
  storage();
  vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => { throw new Error('Unavailable'); });
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const transport = createWorkspaceActionTransport('workspace', binding, 0, 1, 'owner');
  await expect(transport.submit({ type: 'back' })).rejects.toThrow('Workspace recovery storage is unavailable');
  expect(fetch).not.toHaveBeenCalled();
});

test('transient inspection failures leave one pending envelope and exhaust the configured budget', async () => {
  storage();
  vi.stubGlobal('window', { location: { origin: 'https://example.invalid' } });
  const pending = pendingOperation('owner', 'workspace');
  const fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
    expect(pending.load()?.envelope.action).toEqual({ type: 'back' });
    if (String(url).endsWith('/api/browser-token')) return Response.json({ token: 'test-token' });
    expect(JSON.parse(String(init?.body))).toEqual(pending.load()?.envelope);
    return Response.json({}, { status: 503 });
  });
  vi.stubGlobal('fetch', fetch);
  const transport = createWorkspaceActionTransport('workspace', binding, 0, 1, 'owner',
    { delaysMs: [0, 0, 0], timeoutMs: 1000 });
  await expect(transport.submit({ type: 'back' })).rejects.toThrow();
  const urls = fetch.mock.calls.map(([url]) => String(url));
  expect(urls.filter(url => url.endsWith('/actions'))).toHaveLength(1);
  expect(urls.filter(url => url.endsWith('/operations/status'))).toHaveLength(3);
  expect(transport.needsAttention()).toBe(true);
  expect(() => transport.submit({ type: 'back' })).toThrow();
  expect(pending.load()?.envelope.operationSequence).toBe(1);
});
