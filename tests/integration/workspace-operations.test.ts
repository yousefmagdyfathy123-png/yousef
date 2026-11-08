import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { withTestDatabase } from '../../tools/db/test-database';
import { migrate } from '../../tools/db/migrate';
import { loadCatalog, type LoadedCatalog } from '../../src/server/catalog';
import { createWorkspaceStore } from '../../src/server/engineering/workspace-store';
import { createWorkspaceOperations } from '../../src/server/engineering/operations';
import { createWorkspaceResume } from '../../src/server/engineering/resume';
import { createWorkspaceSearch } from '../../src/server/engineering/search';
import searchFixture from '../reference/state/search.json';
import { createEntitlements } from '../../src/server/access/entitlement';
import { unconfiguredRegistry } from '../../src/server/access/trial-registry/unconfigured';
import type { PublicWorkResult } from '../../src/shared/public-contracts';
import { assertEngineeringEntitlement } from '../../src/server/engineering/access';
import type { Principal } from '../../src/server/auth/principal';

vi.mock('server-only', () => ({}));
const db = new Pool({ connectionString: process.env.ALFADATA_TEST_DATABASE_URL });
const peer = new Pool({ connectionString: process.env.ALFADATA_TEST_DATABASE_URL });
let catalog: LoadedCatalog;
const checkAccess = async () => {};
beforeAll(async () => { await migrate(db); catalog = await loadCatalog('private/catalog'); });
afterAll(async () => { await Promise.all([db.end(), peer.end()]); });

test('lost and concurrent responses replay a single commit, including after reopening the service', async () => {
  const userId = randomUUID();
  await db.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES ($1,$1,$2,true)', [userId, userId + '@example.invalid']);
  const principal: Principal = { userId, sessionId: randomUUID(), emailVerified: true, suspended: false, role: 'user' };
  await db.query(`INSERT INTO "session"(id,"userId",token,"expiresAt","updatedAt")
    VALUES ($1,$2,$1,now()+interval '1 hour',now())`, [principal.sessionId, userId]);
  await db.query("INSERT INTO entitlement_grants(id,user_id,granted_at) VALUES ($1,$1,now()-interval '1 second')", [userId]);
  const access = createEntitlements({
    database: db, registry: unconfiguredRegistry, identity: null, epoch: undefined, protect: async () => {},
  });
  const checkRealAccess = async (actor: Principal, client: PoolClient) =>
    assertEngineeringEntitlement(await access.getEntitlement(actor, client));
  const store = createWorkspaceStore({ database: db, catalog, checkAccess: checkRealAccess });
  const workspace = await store.createWorkspace(principal, 'tab-a');
  const first = createWorkspaceOperations(store, catalog);
  const other = createWorkspaceOperations(createWorkspaceStore({ database: peer, catalog, checkAccess: checkRealAccess }), catalog);
  const operation = { operationId: randomUUID(), operationSequence: 1, expectedRevision: workspace.revision, action: { type: 'back' } };
  const dispatch = (value: unknown, actor = principal) => other(actor, workspace.id, workspace, value);
  expect(await first.getOperationStatus(principal, workspace.id, workspace, operation)).toEqual({ kind: 'not-committed' });
  const [lost, reply, inspected] = await Promise.all([
    first(principal, workspace.id, workspace, operation),
    dispatch(operation),
    other.getOperationStatus(principal, workspace.id, workspace, operation),
  ]);
  expect(reply).toEqual(lost);
  if (inspected.kind === 'committed') expect(inspected.result).toEqual(reply.result);
  else expect(inspected).toEqual({ kind: 'not-committed' });
  expect(reply.result.revision).toBe(workspace.revision + 1);
  const snapshot = async () => (await db.query('SELECT * FROM workspaces WHERE id=$1', [workspace.id])).rows[0];
  const saved = await snapshot();
  const search = createWorkspaceSearch(store, catalog);
  const searchFor = (actor: Principal, binding = workspace) => search(actor, workspace.id, binding, { query: 'elbow' });
  const statusFor = (actor: Principal, binding = workspace) => first.getOperationStatus(actor, workspace.id, binding, operation);
  const otherGeneration = { ...workspace, recoveryGeneration: 'restored' };
  await expect(searchFor(principal, otherGeneration)).rejects.toMatchObject({ status: 404 });
  await expect(statusFor(principal, otherGeneration)).rejects.toMatchObject({ status: 404 });
  for (const sample of searchFixture.cases.filter(item => ['', 'elbow', 'BLIND', 'zzzzzz', 'z['].includes(item.query))) {
    const result = search(principal, workspace.id, workspace, { query: sample.query });
    if (sample.error) await expect(result).rejects.toMatchObject({ status: 400 });
    else {
      const { hits } = await result;
      expect(hits.map(({ id, text }) => ({ id, text }))).toEqual(sample.hits);
      expect(hits.every(hit => typeof hit.context === 'string' && hit.context.length > 0)).toBe(true);
    }
  }
  expect(await first.getOperationStatus(principal, workspace.id, workspace, operation)).toEqual({ kind: 'committed', result: reply.result });
  expect(await first.getOperationStatus(principal, workspace.id, workspace, { ...operation, operationId: randomUUID() }))
    .toEqual({ kind: 'conflict' });
  const blocker = await peer.connect();
  try {
    await blocker.query('BEGIN');
    await blocker.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE', [workspace.id]);
    expect(await statusFor(principal)).toEqual({ kind: 'unknown' });
  } finally {
    await blocker.query('ROLLBACK');
    blocker.release();
  }
  await db.query(`
    UPDATE workspace_operation_receipts SET public_result=jsonb_set(public_result,'{view,privateSource}','"secret"')
    WHERE workspace_id=$1 AND operation_sequence=1
  `, [workspace.id]);
  try {
    await expect(dispatch(operation)).rejects.toMatchObject({ code: 'workspace-incompatible' });
    await expect(first.getOperationStatus(principal, workspace.id, workspace, operation))
      .rejects.toMatchObject({ code: 'workspace-incompatible' });
    expect(await snapshot()).toEqual(saved);
  } finally {
    await db.query('UPDATE workspace_operation_receipts SET public_result=$2 WHERE workspace_id=$1 AND operation_sequence=1',
      [workspace.id, reply.result]);
  }
  expect(await dispatch(operation)).toEqual(reply);
  expect(await snapshot()).toEqual(saved);
  for (const changed of [
    { ...operation, action: { type: 'forward' } }, { ...operation, expectedRevision: 0 },
    { ...operation, operationId: randomUUID() },
    { ...operation, operationId: randomUUID(), operationSequence: 2 },
    { ...operation, operationSequence: 2, expectedRevision: reply.result.revision },
    { ...operation, operationId: randomUUID(), operationSequence: 3, expectedRevision: reply.result.revision },
  ]) await expect(dispatch(changed)).rejects.toMatchObject({ status: 409 });
  await db.query('INSERT INTO account_access(user_id,suspended) VALUES ($1,true)', [userId]);
  await expect(dispatch(operation)).rejects.toMatchObject({ status: 403, reason: 'suspended' });
  await expect(searchFor(principal)).rejects.toMatchObject({ status: 403, reason: 'suspended' });
  await expect(statusFor(principal)).rejects.toMatchObject({ status: 403, reason: 'suspended' });
  await db.query('UPDATE account_access SET suspended=false WHERE user_id=$1', [userId]);
  await db.query('UPDATE "user" SET "emailVerified"=false WHERE id=$1', [userId]);
  await expect(searchFor(principal)).rejects.toMatchObject({ status: 403, reason: 'email-unverified' });
  await expect(statusFor(principal)).rejects.toMatchObject({ status: 403, reason: 'email-unverified' });
  await db.query('UPDATE "user" SET "emailVerified"=true WHERE id=$1', [userId]);
  await db.query('UPDATE "session" SET "expiresAt"=now() WHERE id=$1', [principal.sessionId]);
  await expect(dispatch(operation)).rejects.toMatchObject({ status: 401, reason: 'unauthenticated' });
  await expect(searchFor(principal)).rejects.toMatchObject({ status: 401, reason: 'unauthenticated' });
  await expect(statusFor(principal)).rejects.toMatchObject({ status: 401, reason: 'unauthenticated' });
  await db.query(`UPDATE "session" SET "expiresAt"=now()+interval '1 hour' WHERE id=$1`, [principal.sessionId]);
  const foreign = { ...principal, userId: randomUUID(), sessionId: randomUUID() };
  await db.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES ($1,$1,$2,true)', [foreign.userId, foreign.userId + '@example.invalid']);
  await db.query(`INSERT INTO "session"(id,"userId",token,"expiresAt","updatedAt")
    VALUES ($1,$2,$1,now()+interval '1 hour',now())`, [foreign.sessionId, foreign.userId]);
  await db.query("INSERT INTO entitlement_grants(id,user_id,granted_at) VALUES ($1,$1,now()-interval '1 second')", [foreign.userId]);
  await expect(dispatch(operation, foreign)).rejects.toMatchObject({ status: 404 });
  await expect(searchFor(foreign)).rejects.toMatchObject({ status: 404 });
  await expect(statusFor(foreign)).rejects.toMatchObject({ status: 404 });
  expect(await snapshot()).toEqual(saved);

  const next = { ...operation, operationId: randomUUID(), operationSequence: 2, expectedRevision: reply.result.revision };
  await db.query(`ALTER TABLE workspace_operation_receipts ADD CONSTRAINT test_reject_second CHECK (operation_sequence <> 2)`);
  try {
    await expect(dispatch(next)).rejects.toThrow();
    expect(await snapshot()).toEqual(saved);
    expect((await db.query('SELECT 1 FROM workspace_operation_receipts WHERE workspace_id=$1', [workspace.id])).rowCount).toBe(1);
  } finally {
    await db.query('ALTER TABLE workspace_operation_receipts DROP CONSTRAINT test_reject_second');
  }
  const committed = await dispatch(next);
  expect((await dispatch(operation)).result).toEqual(reply.result);
  expect((await dispatch(operation)).workspace.lastOperationSequence).toBe(2);
  expect(committed.result.revision).toBe(reply.result.revision + 1);
  const resume = createWorkspaceResume(store, workspace => workspace);
  const newActor = { ...principal, sessionId: randomUUID() };
  await db.query(`INSERT INTO "session"(id,"userId",token,"expiresAt","updatedAt")
    VALUES ($1,$2,$1,now()+interval '1 hour',now())`, [newActor.sessionId, userId]);
  expect(await resume.getResumeInfo(newActor, workspace.id)).toEqual({ bindingRevision: 0 });
  const resumeBody = { tabId: 'tab-resumed', expectedBindingRevision: 0, resumeRequestId: 'resume-a' };
  const resumed = await resume.resumeWorkspace(newActor, workspace.id, resumeBody);
  expect(resumed).toMatchObject({ bindingRevision: 1, state: committed.workspace.state, lastOperationSequence: 2 });
  expect(await resume.resumeWorkspace(newActor, workspace.id, resumeBody)).toEqual(resumed);
  await expect(resume.resumeWorkspace(newActor, workspace.id, { ...resumeBody, resumeRequestId: 'resume-b' }))
    .rejects.toMatchObject({ status: 409 });
  await expect(dispatch(next)).rejects.toMatchObject({ status: 404 });
  await expect(search(principal, workspace.id, workspace, { query: 'elbow' })).rejects.toMatchObject({ status: 404 });
  expect(await first.getOperationStatus(newActor, workspace.id, resumed, next)).toEqual({ kind: 'committed', result: committed.result });
  const candidates = [principal, newActor];
  const requests = candidates.map((actor, index) => ({
    actor, body: { tabId: 'competing-tab-' + index, expectedBindingRevision: 1, resumeRequestId: 'competing-' + index },
  }));
  const attempts = await Promise.allSettled(requests.map(({ actor, body }) => resume.resumeWorkspace(actor, workspace.id, body)));
  const winner = attempts.findIndex(outcome => outcome.status === 'fulfilled');
  const won = attempts[winner];
  expect(won?.status).toBe('fulfilled');
  if (won?.status !== 'fulfilled') throw new Error('Expected a successful resume');
  expect(attempts[1 - winner]).toMatchObject({ status: 'rejected', reason: { status: 409 } });
  await expect(resume.resumeWorkspace(newActor, workspace.id, resumeBody)).rejects.toMatchObject({ status: 409 });
  await db.query("UPDATE workspaces SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1", [workspace.id]);
  try {
    await expect(first(requests[winner].actor, workspace.id, won.value, next))
      .rejects.toMatchObject({ status: 410, code: 'workspace-expired' });
    await expect(searchFor(requests[winner].actor, won.value)).rejects.toMatchObject({ status: 410 });
    await expect(statusFor(requests[winner].actor, won.value)).rejects.toMatchObject({ status: 410 });
  } finally {
    await db.query('DELETE FROM workspaces WHERE id=$1', [workspace.id]);
  }
}, 30_000);

test('keeps the last 100 of 2000 receipts and preserves the cursor through logical restoration', async () => {
  const userId = randomUUID();
  await db.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES ($1,$1,$2,true)', [userId, userId + '@example.invalid']);
  const principal: Principal = { userId, sessionId: randomUUID(), emailVerified: true, suspended: false, role: 'user' };
  const store = createWorkspaceStore({ database: db, catalog, checkAccess });
  const created = await store.createWorkspace(principal, 'tab-b');
  const state = created.state;
  const view = state.legacySession!.lastView!;
  view.drawing.commands = [];
  view.controls = [];
  state.legacyBuffers = { activeDba: { 0: { 1: { 2: 'retained' } } }, lineMem: {} };
  state.revision++;
  await store.saveWorkspace(principal, created.id, created.revision, state, created.tabId);
  const execute = vi.fn((current: typeof state) => ({
    state: { ...current, revision: current.revision + 1 }, view: current.legacySession!.lastView!, trace: [], evidenceIds: [],
  }));
  const dispatch = createWorkspaceOperations(store, catalog, execute);
  const envelope = (sequence: number) => ({
    operationId: 'operation-' + sequence, operationSequence: sequence,
    expectedRevision: state.revision + sequence - 1, action: { type: 'back' },
  });
  async function snapshotStorage() {
    const { rows: [sizes] } = await db.query(`
      SELECT pg_relation_size('workspace_operation_receipts')::text AS "receiptHeapBytes",
        pg_indexes_size('workspace_operation_receipts')::text AS "receiptIndexBytes",
        pg_total_relation_size('workspace_operation_receipts')::text AS "receiptTotalBytes",
        (SELECT n_dead_tup::text FROM pg_stat_user_tables WHERE relname = 'workspace_operation_receipts') AS "estimatedDeadTuples",
        (SELECT octet_length(encoded_state::text) FROM workspaces WHERE id = $1) AS "stateJsonBytes",
        (SELECT sum(octet_length(public_result::text))::text
          FROM workspace_operation_receipts WHERE workspace_id = $1) AS "liveReceiptJsonBytes",
        pg_current_wal_lsn()::text AS wal`, [created.id]);
    return sizes;
  }
  const started = performance.now();
  const before = await snapshotStorage();
  let retained: PublicWorkResult | undefined;
  for (let sequence = 1; sequence <= 2000; sequence++) {
    const reply = await dispatch(principal, created.id, created, envelope(sequence));
    const { rows: [cursor] } = await db.query(`
      SELECT count(*)::int AS count, min(operation_sequence)::text AS first,
        max(operation_sequence)::text AS last, max(pg_column_size(last_operation_sequence)) AS "cursorBytes"
      FROM workspaces JOIN workspace_operation_receipts ON id = workspace_id WHERE id = $1`, [created.id]);
    expect(cursor).toEqual({ count: Math.min(sequence, 100), first: String(Math.max(1, sequence - 99)),
      last: String(sequence), cursorBytes: 8 });
    if (sequence === 1901) retained = reply.result;
  }
  expect(execute).toHaveBeenCalledTimes(2000);
  const counts = await db.query(`SELECT count(*) AS count, min(operation_sequence) AS first,
    max(operation_sequence) AS last FROM workspace_operation_receipts WHERE workspace_id=$1`, [created.id]);
  expect(counts.rows).toEqual([{ count: '100', first: '1901', last: '2000' }]);
  expect((await dispatch(principal, created.id, created, envelope(1901))).result).toEqual(retained);
  await expect(dispatch(principal, created.id, created, envelope(1900))).rejects.toMatchObject({ code: 'OPERATION_RESULT_EXPIRED' });
  expect(await dispatch.getOperationStatus(principal, created.id, created, envelope(1900)))
    .toEqual({ kind: 'result-expired' });
  expect(execute).toHaveBeenCalledTimes(2000);
  const after = await snapshotStorage();
  const { rows: [wal] } = await db.query('SELECT pg_wal_lsn_diff($1, $2)::text AS bytes', [after.wal, before.wal]);
  const workspace = (await db.query('SELECT to_jsonb(w) AS row FROM workspaces w WHERE id=$1', [created.id])).rows[0].row;
  const receipts = (await db.query('SELECT jsonb_agg(r) AS rows FROM workspace_operation_receipts r WHERE workspace_id=$1', [created.id])).rows[0].rows;

  await withTestDatabase(async url => {
    const restored = new Pool({ connectionString: url });
    try {
      await migrate(restored);
      await restored.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES ($1,$1,$2,true)', [userId, userId + '@example.invalid']);
      await restored.query('INSERT INTO workspaces SELECT * FROM jsonb_populate_record(NULL::workspaces,$1)', [workspace]);
      await restored.query('INSERT INTO workspace_operation_receipts SELECT * FROM jsonb_populate_recordset(NULL::workspace_operation_receipts,$1)', [JSON.stringify(receipts)]);
      const green = createWorkspaceOperations(createWorkspaceStore({ database: restored, catalog, checkAccess }), catalog, execute);
      const recovered = await green(principal, created.id, created, envelope(1901));
      expect(recovered.result).toEqual(retained);
      expect(recovered.workspace.lastOperationSequence).toBe(2000);
      expect(recovered.workspace.state.history).toEqual(state.history);
      expect(recovered.workspace.state.legacyBuffers).toEqual(state.legacyBuffers);
      await expect(green(principal, created.id, created, envelope(1900))).rejects.toMatchObject({ status: 410 });
      await expect(green(principal, created.id, created, envelope(2002))).rejects.toMatchObject({ status: 409 });
      expect(execute).toHaveBeenCalledTimes(2000);
      const next = await green(principal, created.id, created, envelope(2001));
      expect(next.workspace.lastOperationSequence).toBe(2001);
      expect(execute).toHaveBeenCalledTimes(2001);
    } finally {
      await restored.end();
    }
  });
  if (process.env.ALFADATA_RECEIPT_EVIDENCE) {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(process.env.ALFADATA_RECEIPT_EVIDENCE, JSON.stringify({
      scope: 'PostgreSQL sequenced transaction and logical restoration with injected deterministic transition',
      operations: 2000, maximumLiveReceipts: 100, cursorBytes: 8, elapsedMs: performance.now() - started,
      before, after, walBytes: wal.bytes, logicalWorkspaceAndReceiptExportBytes: Buffer.byteLength(JSON.stringify({ workspace, receipts })),
      verified: ['live bounds after every commit', 'retained replay', 'evicted replay denial', 'cursor and buffers after logical restoration'],
    }, null, 2) + '\n');
  }
}, 240_000);
