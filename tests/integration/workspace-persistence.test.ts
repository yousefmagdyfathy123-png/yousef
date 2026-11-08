import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { migrate } from '../../tools/db/migrate';
import { createWorkspaceStore } from '../../src/server/engineering/workspace-store';
import { cleanupExpiredWorkspaces } from '../../tools/db/cleanup-workspaces';
import { loadCatalog, type LoadedCatalog } from '../../src/server/catalog';
import { createEntitlements } from '../../src/server/access/entitlement';
import { unconfiguredRegistry } from '../../src/server/access/trial-registry/unconfigured';
import { assertEngineeringEntitlement } from '../../src/server/engineering/access';
import { createPreferences } from '../../src/server/preferences/service';
import { startupDefaults } from '../../src/shared/preference-contracts';
import { transition } from '../../src/legacy/state/transition';
import { loadFlangeCases } from '../reference/flange-cases';
import type { Principal } from '../../src/server/auth/principal';

vi.mock('server-only', () => ({}));
const database = new Pool({ connectionString: process.env.ALFADATA_TEST_DATABASE_URL });
const peer = new Pool({ connectionString: process.env.ALFADATA_TEST_DATABASE_URL });
let catalog: LoadedCatalog;
const preferences = createPreferences(database);
const retention = 7 * 24 * 60 * 60 * 1000;
function store(db = database) {
  const access = createEntitlements({
    database: db, registry: unconfiguredRegistry, identity: null, epoch: undefined, protect: async () => {},
  });
  return createWorkspaceStore({
    database: db, catalog,
    checkAccess: async (principal, client) => assertEngineeringEntitlement(await access.getEntitlement(principal, client)),
  });
}
beforeAll(async () => { await migrate(database); catalog = await loadCatalog('private/catalog'); });
afterAll(async () => { await Promise.all([database.end(), peer.end()]); });

async function account(): Promise<Principal> {
  const userId = randomUUID(), sessionId = randomUUID();
  await database.query('INSERT INTO "user"(id, name, email, "emailVerified") VALUES ($1, $1, $2, true)', [userId, userId + '@example.invalid']);
  await database.query(`INSERT INTO "session"(id, "userId", token, "expiresAt", "updatedAt")
    VALUES ($1, $2, $1, now() + interval '1 hour', now())`, [sessionId, userId]);
  await database.query("INSERT INTO entitlement_grants(id, user_id, granted_at) VALUES ($1,$1,now()-interval '1 second')", [userId]);
  return { userId, sessionId, emailVerified: true, suspended: false, role: 'user' };
}

test('restores exact private state across connections and fences foreign, stale and incompatible workspaces', async () => {
  const principal = await account();
  const a = store(), b = store(peer);
  const created = await a.createWorkspace(principal, 'tab-a');
  expect(created.state.legacySession!.lastView).toEqual(loadFlangeCases('Flan1')[0].expected.view);
  const next = transition(created.state, { type: 'select-route', routeId: 'Flan7' }, catalog).state;
  next.values.negativeZero = -0;
  next.values.nan = NaN;
  next.values.infinity = Infinity;
  const sparse: (string | null)[] = new Array(40);
  sparse[0] = null;
  sparse[39] = 'sentinel';
  next.legacyBuffers.activeDba[1] ??= {};
  next.legacyBuffers.activeDba[1][3] = sparse;
  const results = await Promise.allSettled([
    a.saveWorkspace(principal, created.id, created.revision, next, 'tab-a'),
    b.saveWorkspace(principal, created.id, created.revision, next, 'tab-a'),
  ]);
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.find(result => result.status === 'rejected')).toMatchObject({ reason: { status: 409 } });
  const recovered = await b.loadWorkspace(principal, created.id, 'tab-a');
  expect(recovered.state).toEqual(next);
  expect(Object.is(recovered.state.values.negativeZero, -0)).toBe(true);
  expect(recovered.state.values.nan).toBeNaN();
  expect(Object.hasOwn(recovered.state.legacyBuffers.activeDba[1][3], 1)).toBe(false);
  expect(transition(recovered.state, { type: 'back' }, catalog)).toEqual(transition(next, { type: 'back' }, catalog));
  await expect(a.loadWorkspace(await account(), created.id, 'tab-a')).rejects.toMatchObject({ status: 404 });
  await expect(a.loadWorkspace({ ...principal, sessionId: 'different' }, created.id, 'tab-a')).rejects.toMatchObject({ status: 401 });
  const secondSession = randomUUID();
  await database.query(`INSERT INTO "session"(id, "userId", token, "expiresAt", "updatedAt")
    VALUES ($1, $2, $1, now() + interval '1 hour', now())`, [secondSession, principal.userId]);
  await expect(a.loadWorkspace({ ...principal, sessionId: secondSession }, created.id, 'tab-a')).rejects.toMatchObject({ status: 404 });
  await expect(a.loadWorkspace(principal, created.id, 'tab-b')).rejects.toMatchObject({ status: 404 });
  const snapshot = async () => (await database.query('SELECT * FROM workspaces WHERE id=$1', [created.id])).rows[0];
  const saved = await snapshot();
  await expect(a.readWorkspace(principal, created.id, 'tab-a', () => { throw new Error('projection failed'); }))
    .rejects.toThrow('projection failed');
  expect(await snapshot()).toEqual(saved);
  await expect(a.saveWorkspace(principal, created.id, recovered.revision, { ...next, revision: -1 }, 'tab-a')).rejects.toMatchObject({ status: 409 });
  expect(await snapshot()).toEqual(saved);
  await database.query("UPDATE workspaces SET encoded_state=jsonb_set(encoded_state, '{state,0}', '\"unknown\"') WHERE id=$1", [created.id]);
  const corrupt = await snapshot();
  await expect(b.loadWorkspace(principal, created.id, 'tab-a')).rejects.toMatchObject({ status: 409, code: 'workspace-incompatible' });
  expect(await snapshot()).toEqual(corrupt);
  await database.query('UPDATE workspaces SET encoded_state=$2, engine_version=$3 WHERE id=$1', [created.id, saved.encoded_state, 'future']);
  const incompatible = await snapshot();
  await expect(a.loadWorkspace(principal, created.id, 'tab-a')).rejects.toMatchObject({ status: 409, code: 'workspace-incompatible' });
  expect(await snapshot()).toEqual(incompatible);
}, 30_000);

test('preferences apply once, cleanup preserves account data and authorized reads renew activity', async () => {
  const principal = await account();
  const workspaces = store();
  const a = await workspaces.createWorkspace(principal, 'tab-a');
  const configured = { ...startupDefaults, units: 'Imperial', listUnits: 'Millimetres', temperature: 'Fahrenheit', fractions: true } as const;
  const [, raced] = await Promise.all([
    preferences.savePreferences(principal, 0, configured),
    workspaces.createWorkspace(principal, 'tab-race'),
  ]);
  const b = await workspaces.createWorkspace(principal, 'tab-b');
  expect(a.preferenceVersion).toBe(0);
  expect(b.preferenceVersion).toBe(1);
  expect(b.state.values).toMatchObject({ Units: 'Imperial', ListUnits: 'Millimeters', DegUnits: 'Fahrenheit', Fractionize: 'Yes' });
  expect(raced.state).toEqual(raced.preferenceVersion === 0 ? a.state : b.state);
  expect((await workspaces.loadWorkspace(principal, a.id, 'tab-a')).state).toEqual(a.state);
  const changed = transition(a.state, { type: 'configure', ...configured, units: 'Metric' }, catalog).state;
  await workspaces.saveWorkspace(principal, a.id, a.revision, changed, 'tab-a');
  expect((await preferences.getPreferences(principal)).values).toEqual(configured);
  expect((await workspaces.loadWorkspace(principal, b.id, 'tab-b')).state).toEqual(b.state);
  const renewed = await workspaces.loadWorkspace(principal, a.id, 'tab-a');
  expect(renewed.expiresAt.getTime() - renewed.lastActivityAt.getTime()).toBe(retention);

  await database.query("UPDATE workspaces SET last_activity_at=now()-interval '168 hours', expires_at=now() WHERE id=$1", [a.id]);
  await expect(workspaces.loadWorkspace(principal, a.id, 'tab-a')).rejects.toMatchObject({ status: 410 });
  expect(await cleanupExpiredWorkspaces(peer)).toBe(1);
  expect(await cleanupExpiredWorkspaces(peer)).toBe(0);
  const racer = await database.connect();
  try {
    // The activity acquires the lock before expiry. Cleanup starts after the old deadline.
    await racer.query("UPDATE workspaces SET expires_at=clock_timestamp()+interval '500 milliseconds' WHERE id=$1", [b.id]);
    await racer.query('BEGIN');
    await racer.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE', [b.id]);
    await vi.waitFor(async () => {
      expect((await racer.query('SELECT expires_at <= clock_timestamp() AS expired FROM workspaces WHERE id=$1', [b.id])).rows[0].expired).toBe(true);
    });
    const cleaning = cleanupExpiredWorkspaces(peer);
    try {
      await vi.waitFor(async () => {
        await racer.query('SELECT pg_stat_clear_snapshot()');
        const { rowCount } = await racer.query(`SELECT pid FROM pg_stat_activity
          WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'DELETE FROM workspaces%'`);
        expect(rowCount).toBe(1);
      });
      await racer.query(`UPDATE workspaces SET last_activity_at=clock_timestamp(),
        expires_at=clock_timestamp()+interval '168 hours' WHERE id=$1`, [b.id]);
    } finally {
      await racer.query('COMMIT');
      expect(await cleaning).toBe(0);
    }
  } finally {
    await racer.query('ROLLBACK');
    racer.release();
  }
  expect((await workspaces.loadWorkspace(principal, b.id, 'tab-b')).state).toEqual(b.state);
  expect((await workspaces.createWorkspace(principal, 'tab-a')).state).toEqual(b.state);
  expect((await preferences.getPreferences(principal)).version).toBe(1);
  expect((await database.query('SELECT id FROM entitlement_grants WHERE user_id=$1', [principal.userId])).rowCount).toBe(1);
}, 30_000);
