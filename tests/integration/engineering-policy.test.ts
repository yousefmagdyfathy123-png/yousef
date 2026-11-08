import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { migrate } from '../../tools/db/migrate';
import { createIdentity } from '../../src/server/auth/config';
import { createLocalMailTransport } from '../../src/server/mail/local';
import { createEntitlements } from '../../src/server/access/entitlement';
import { trialIdentity } from '../../src/server/access/trial-identity';
import { createBrowserProtection } from '../../src/server/security/browser-mutation';
import { createEngineeringPolicy } from '../../src/server/engineering/access';
import { parseWorkspaceAction, workspaceResultResponse } from '../../src/server/engineering/actions';
import type { TrialStart } from '../../src/server/access/trial-registry/types';
import type { WorkResult } from '../../src/legacy/contracts';

vi.mock('server-only', () => ({}));

const database = new Pool({ connectionString: process.env.ALFADATA_TEST_DATABASE_URL });
const mail = createLocalMailTransport();
const origin = 'http://127.0.0.1:3186';
const secret = 'integration-secret-not-for-production-123';
let identity: ReturnType<typeof createIdentity>;
const readPrincipal: ReturnType<typeof createIdentity>['getPrincipal'] = request => identity.getPrincipal(request);
const protect = createBrowserProtection({ origin, secret, readPrincipal });
let now = new Date();
const decisions = new Map<string, TrialStart>();
const entitlements = createEntitlements({
  database, protect: protect.require, now: () => now, epoch: 'policy',
  identity: trialIdentity('policy', 'key1', 'ab'.repeat(32)),
  registry: {
    async lookup(subject) {
      const decision = decisions.get(subject);
      return decision ? { status: 'found', decision } : { status: 'absent' };
    },
    async createIfAbsent(subject, proposal) {
      const decision = decisions.get(subject) ?? proposal;
      decisions.set(subject, decision);
      return { status: 'found', decision };
    },
  },
});
const policy = createEngineeringPolicy({ readPrincipal, ...entitlements, protect: protect.require });
beforeAll(async () => {
  await migrate(database);
  identity = createIdentity({ database, mail, origin, secret });
});
afterAll(() => database.end());

test('verified auth owns the scope, browser protection precedes trial entry, and every operation rechecks access', async () => {
  const email = 'policy@example.invalid';
  const credentials = { email, password: 'Workspace long password' };
  const post = (path: string, body: object) => identity.handler(new Request(origin + '/api/auth/' + path, {
    method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body),
  }));
  const request = (cookie = '', csrf = '', method = 'POST') => new Request(origin + '/api/workspace/enter', {
    method, headers: { origin, cookie, 'x-alfadata-csrf': csrf, 'x-user-id': 'forged', 'x-session-id': 'forged' },
  });
  await expect(policy.requireAccess(request())).rejects.toMatchObject({ reason: 'unauthenticated' });
  await expect(policy.requireEntry(request())).rejects.toMatchObject({ reason: 'unauthenticated' });
  expect((await post('sign-up/email', { name: 'Policy tester', ...credentials })).ok).toBe(true);
  const link = mail.messages.at(-1)!.text.match(/https?:\/\/\S+/)![0];
  await identity.handler(new Request(link));
  const signedIn = await post('sign-in/email', credentials);
  const cookie = signedIn.headers.get('set-cookie')!.split(';')[0];
  const principal = (await identity.getPrincipal(request(cookie)))!;
  const csrf = await protect.issue(request(cookie));
  await database.query('UPDATE "user" SET "emailVerified" = false WHERE id = $1', [principal.userId]);
  for (const check of [policy.requireAccess, policy.requireEntry, policy.requireMutation]) {
    await expect(check(request(cookie, csrf))).rejects.toMatchObject({ reason: 'email-unverified' });
  }
  await database.query('UPDATE "user" SET "emailVerified" = true WHERE id = $1', [principal.userId]);
  await expect(policy.requireEntry(request(cookie))).rejects.toMatchObject({ status: 403 });
  await expect(policy.requireEntry(request(cookie, csrf, 'GET'))).rejects.toMatchObject({ status: 403 });
  await expect(policy.requireAccess(request(cookie))).rejects.toMatchObject({ reason: 'trial-not-started' });
  expect(decisions.size).toBe(0);
  expect(await policy.requireEntry(request(cookie, csrf))).toEqual(principal);
  expect(await policy.requireMutation(request(cookie, csrf))).toEqual(principal);
  await expect(policy.requireMutation(request(cookie))).rejects.toMatchObject({ status: 403 });
  const result: WorkResult = {
    state: {
      routeId: '', culture: { name: 'en-US', decimalSeparator: '.', groupSeparator: ',' },
      values: {}, revision: 3, history: { ids: ['private'], index: 0 },
      legacyBuffers: { activeDba: { 0: { 0: { 0: 'raw-catalog-marker' } } }, lineMem: {} },
    },
    view: { headers: [], messages: [], controls: [], visibility: {}, drawing: { width: 1, height: 1, transform: [1, 0, 0, 1, 0, 0], commands: [] } },
    trace: [{ operation: 'read', sourceId: 'private-table', value: 'private-token' }], evidenceIds: ['private-evidence'],
  };
  const workspace = { id: 'workspace-a', userId: principal.userId, sessionId: principal.sessionId };
  await expect(workspaceResultResponse(principal, { ...workspace, userId: 'foreign' }, result, policy.checkAccess))
    .rejects.toMatchObject({ status: 404 });
  const response = await workspaceResultResponse(principal, workspace, result, policy.checkAccess);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(await response.json()).toEqual({
    workspaceId: 'workspace-a', revision: 3, inputAccepted: true, view: result.view,
  });
  now = new Date(now.getTime() + 120 * 60 * 60 * 1000);
  for (const check of [policy.requireAccess, policy.requireEntry, policy.requireMutation]) {
    await expect(check(request(cookie, csrf))).rejects.toMatchObject({ reason: 'trial-expired' });
  }
  await expect(workspaceResultResponse(principal, workspace, result, policy.checkAccess))
    .rejects.toMatchObject({ reason: 'trial-expired' });
  await database.query('UPDATE account_access SET suspended = true WHERE user_id = $1', [principal.userId]);
  for (const check of [policy.requireAccess, policy.requireEntry, policy.requireMutation]) {
    await expect(check(request(cookie, csrf))).rejects.toMatchObject({ reason: 'suspended' });
  }
  await database.query('UPDATE "session" SET "expiresAt" = now() WHERE id = $1', [principal.sessionId]);
  await expect(policy.requireAccess(request(cookie))).rejects.toMatchObject({ reason: 'unauthenticated' });
});

test('action schema accepts only current source-owned selections and separate operation metadata', () => {
  const scope = {
    routeIds: new Set(['pipes']), inputIds: new Set(['diameter']),
    controls: [{ id: 'size', visible: true, enabled: true,
      options: [{ value: 'DN50', enabled: true }, { value: 'DN80', enabled: false }] }],
  };
  const operation = { operationId: randomUUID(), operationSequence: 1, expectedRevision: 0 };
  const action = { type: 'select-option', controlId: 'size', value: 'DN50' };
  expect(parseWorkspaceAction({ ...operation, action }, scope)).toEqual({ ...operation, action });
  for (const invalid of [
    { ...action, value: 'DN80' }, { ...action, value: 'column:17' }, { ...action, column: 17 },
    { ...action, operationId: operation.operationId }, { ...action, controlId: 'hidden' },
    { type: 'select-route', routeId: '../Database' }, { type: 'input', fieldId: 'path', raw: '123' },
  ]) {
    expect(() => parseWorkspaceAction({ ...operation, action: invalid }, scope)).toThrow();
  }
  expect(() => parseWorkspaceAction({ ...operation, operationSequence: -1, action }, scope)).toThrow();
  expect(() => parseWorkspaceAction({ ...operation, expectedRevision: 0.5, action }, scope)).toThrow();
  expect(() => parseWorkspaceAction({ ...operation, userId: 'forged', action }, scope)).toThrow();
});
