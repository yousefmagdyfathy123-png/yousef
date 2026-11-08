import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { migrate } from '../../tools/db/migrate';
import { createEntitlements } from '../../src/server/access/entitlement';
import { trialIdentity } from '../../src/server/access/trial-identity';
import { initializeLocalRegistry, localRegistry } from '../../src/server/access/trial-registry/local';
import { proposeTrial, type TrialRegistry, type TrialStart } from '../../src/server/access/trial-registry/types';

const url = process.env.ALFADATA_TEST_DATABASE_URL;
if (!url) throw new Error('Use npm run test:integration');
const database = new Pool({ connectionString: url });
const peer = new Pool({ connectionString: url });
beforeAll(async () => { await migrate(database); });
afterAll(async () => { await Promise.all([database.end(), peer.end()]); });

async function account(email: string, verified = true) {
  const userId = randomUUID();
  await database.query('INSERT INTO "user"(id, name, email, "emailVerified") VALUES ($1, $1, $2, $3)', [userId, email, verified]);
  return session(userId);
}

async function session(userId: string) {
  const sessionId = randomUUID();
  await database.query(`
    INSERT INTO "session"(id, "userId", token, "expiresAt", "updatedAt")
    VALUES ($1, $2, $1, now() + interval '1 hour', now())
  `, [sessionId, userId]);
  return { userId, sessionId };
}

test('first protected verified entry is atomic, expires at 120 hours, and respects paid and suspension precedence', async () => {
  const principal = await account('timing@example.invalid', false);
  const identity = trialIdentity('test', 'key1', 'ab'.repeat(32))!;
  let now = new Date('2026-11-01T10:00:00Z');
  let decision: TrialStart | undefined;
  const registry: TrialRegistry = {
    async lookup() { return decision ? { status: 'found', decision } : { status: 'absent' }; },
    async createIfAbsent(_subject, proposal) { return { status: 'found', decision: decision ??= proposal }; },
  };
  const options = { registry, identity, epoch: 'original', now: () => now, protect: async () => {} };
  const a = createEntitlements({ ...options, database });
  const b = createEntitlements({ ...options, database: peer });
  const request = new Request('https://app.example.invalid/api/workspace/enter', { method: 'POST' });
  expect((await a.enterVerifiedWorkspace(request, principal)).reason).toBe('email-unverified');
  await database.query('UPDATE "user" SET "emailVerified" = true WHERE id = $1', [principal.userId]);
  expect((await a.getEntitlement(principal)).reason).toBe('trial-not-started');
  expect(decision).toBeUndefined();
  const denied = createEntitlements({ ...options, database, protect: async () => { throw new Error('denied'); } });
  await expect(denied.enterVerifiedWorkspace(request, principal)).rejects.toThrow('denied');
  expect(decision).toBeUndefined();

  const expected = { reason: 'trial', startedAt: '2026-11-01T10:00:00.000Z', endsAt: '2026-11-06T10:00:00.000Z' };
  const nextSession = await session(principal.userId);
  expect(await Promise.all([a.enterVerifiedWorkspace(request, principal), b.enterVerifiedWorkspace(request, nextSession)]))
    .toEqual([expected, expected]);
  const { rows } = await peer.query('SELECT trial_decision_id, trial_started_at, trial_ends_at FROM account_access WHERE user_id = $1', [principal.userId]);
  expect(rows).toEqual([{ trial_decision_id: decision!.decisionId, trial_started_at: new Date(expected.startedAt), trial_ends_at: new Date(expected.endsAt) }]);
  now = new Date(expected.endsAt);
  expect((await b.getEntitlement(nextSession)).reason).toBe('trial-expired');
  await database.query('INSERT INTO entitlement_grants(id, user_id, granted_at) VALUES ($1, $1, $2)', [principal.userId, now]);
  expect((await a.getEntitlement(principal)).reason).toBe('paid');
  await database.query('UPDATE account_access SET suspended = true WHERE user_id = $1', [principal.userId]);
  expect((await a.getEntitlement(principal)).reason).toBe('suspended');
});

test('durable recovery preserves the decision through lost responses, missing mirrors and replacement identities', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'alfa-recovery-'));
  try {
    const identity = trialIdentity('recovery', 'key1', 'bc'.repeat(32))!;
    const file = join(dir, 'registry.db');
    initializeLocalRegistry(file, identity.registryNamespace);
    const durable = localRegistry(file, identity.registryNamespace);
    const email = 'recovery@example.invalid';
    const first = await account(email);
    const request = new Request('https://app.example.invalid/api/workspace/enter', { method: 'POST' });
    const subject = identity.subjectId(email);
    const startedAt = '2026-11-01T10:00:00.000Z';
    const endsAt = '2026-11-06T10:00:00.000Z';
    const options = { database, identity, now: () => new Date(startedAt), protect: async () => {} };
    let outage = false;
    const interrupted = createEntitlements({ ...options, epoch: 'first', registry: {
      async lookup(id) { return outage ? { status: 'unknown' } : durable.lookup(id); },
      async createIfAbsent(id, proposed) {
        await durable.createIfAbsent(id, proposed);
        outage = true;
        throw new Error('response lost');
      },
    } });
    expect(await interrupted.enterVerifiedWorkspace(request, first)).toEqual({ reason: 'trial-review' });
    expect(await interrupted.getEntitlement(first)).toEqual({ reason: 'trial-review' });
    const mirror = await database.query('SELECT trial_decision_id, trial_started_at FROM account_access WHERE user_id = $1', [first.userId]);
    expect(mirror.rows).toEqual([{ trial_decision_id: null, trial_started_at: null }]);

    // Simulate a PostgreSQL restore before the mirror existed, with a fresh adapter handle.
    await database.query('DELETE FROM account_access WHERE user_id = $1', [first.userId]);
    const restarted = createEntitlements({ ...options, database: peer, epoch: 'restored',
      registry: localRegistry(file, identity.registryNamespace), now: () => new Date('2026-11-02T10:00:00Z') });
    const expected = { reason: 'trial', startedAt, endsAt };
    expect(await restarted.enterVerifiedWorkspace(request, first)).toEqual(expected);
    const registered = await durable.lookup(subject);
    expect(registered).toMatchObject({ status: 'found', decision: { startedAt, endsAt } });

    const fenced = createEntitlements({ ...options, epoch: 'new-epoch', registry: durable });
    expect(await fenced.getEntitlement(first)).toEqual({ reason: 'trial-review' });
    expect(await fenced.enterVerifiedWorkspace(request, first)).toEqual(expected);

    await database.query('DELETE FROM "user" WHERE id = $1', [first.userId]);
    const replacement = await account(email.toUpperCase(), false);
    expect(await restarted.enterVerifiedWorkspace(request, first)).toEqual({ reason: 'unauthenticated' });
    expect(await restarted.enterVerifiedWorkspace(request, replacement)).toEqual({ reason: 'email-unverified' });
    expect((await database.query('SELECT 1 FROM account_access WHERE user_id = $1', [replacement.userId])).rowCount).toBe(0);
    await database.query('UPDATE "user" SET "emailVerified" = true WHERE id = $1', [replacement.userId]);
    expect(await restarted.enterVerifiedWorkspace(request, replacement)).toEqual(expected);
    expect(await durable.lookup(subject)).toEqual(registered);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('review preserves conflicting evidence and valid paid access, and rechecks are audited', async () => {
  const identity = trialIdentity('review', 'key1', 'cd'.repeat(32))!;
  const target = await account('review@example.invalid');
  const actor = await account('review-admin@example.invalid');
  const now = () => new Date('2026-11-04T10:00:00Z');
  const decision = proposeTrial(identity.subjectId('review@example.invalid'), now());
  let writes = 0;
  const registry: TrialRegistry = {
    async lookup() { return { status: 'found', decision }; },
    async createIfAbsent() { writes++; return { status: 'unknown' }; },
  };
  const options = { database, registry, identity, epoch: 'review', now, protect: async () => {} };
  const service = createEntitlements(options);
  const request = new Request('https://app.example.invalid/api/workspace/enter', { method: 'POST' });
  await database.query(`
    INSERT INTO account_access (user_id, trial_started_at, trial_ends_at)
    VALUES ($1, '2026-11-01T10:00Z', '2026-11-06T10:00Z')
  `, [target.userId]);
  expect(await service.enterVerifiedWorkspace(request, target)).toEqual({ reason: 'trial-review' });
  expect(await service.recheckTrial(request, actor, target.userId)).toBe('denied');
  await database.query("INSERT INTO user_roles VALUES ($1, 'admin')", [actor.userId]);
  expect(await service.recheckTrial(request, actor, target.userId)).toBe('review');
  const audit = await database.query('SELECT action, details FROM audit_events WHERE subject_user_id = $1', [target.userId]);
  expect(audit.rows).toEqual([{ action: 'trial.recheck', details: { outcome: 'review' } }]);
  const mirror = await database.query('SELECT trial_started_at, trial_decision_id FROM account_access WHERE user_id = $1', [target.userId]);
  expect(mirror.rows).toEqual([{ trial_started_at: new Date('2026-11-01T10:00Z'), trial_decision_id: null }]);
  expect(writes).toBe(0);

  await database.query('INSERT INTO entitlement_grants(id, user_id, granted_at) VALUES ($1, $1, $2)', [target.userId, now()]);
  const missingKey = createEntitlements({ ...options, identity: null });
  expect(await missingKey.getEntitlement(target)).toEqual({ reason: 'paid' });
  await database.query('UPDATE entitlement_grants SET revoked_at = granted_at WHERE user_id = $1', [target.userId]);
  expect(await missingKey.enterVerifiedWorkspace(request, target)).toEqual({ reason: 'trial-review' });
  expect(writes).toBe(0);
});

test('suspension and session revocation during registry I/O prevent granting access', async () => {
  const identity = trialIdentity('race', 'key1', 'de'.repeat(32))!;
  const request = new Request('https://app.example.invalid/api/workspace/enter', { method: 'POST' });
  for (const reason of ['suspended', 'unauthenticated'] as const) {
    const email = reason + '@example.invalid';
    const user = await account(email);
    let writes = 0;
    const now = () => new Date('2026-11-04T10:00:00Z');
    const decision = proposeTrial(identity.subjectId(email), now());
    const service = createEntitlements({ database, identity, epoch: 'race', now, protect: async () => {},
      registry: {
        async lookup() { return { status: 'absent' }; },
        async createIfAbsent() {
          writes++;
          if (reason === 'suspended') {
            await peer.query('INSERT INTO account_access (user_id, suspended) VALUES ($1, true)', [user.userId]);
          } else {
            await peer.query('DELETE FROM "session" WHERE id = $1', [user.sessionId]);
          }
          return { status: 'found', decision };
        },
      },
    });
    expect(await service.enterVerifiedWorkspace(request, user)).toEqual({ reason });
    expect(await service.enterVerifiedWorkspace(request, user)).toEqual({ reason });
    expect(writes).toBe(1);
    const mirror = await database.query('SELECT 1 FROM account_access WHERE user_id = $1 AND trial_started_at IS NOT NULL', [user.userId]);
    expect(mirror.rowCount).toBe(0);
  }
});
