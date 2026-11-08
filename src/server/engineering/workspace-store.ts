import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { Catalog, WorkState } from '../../legacy/contracts';
import { decodeWorkState, encodeWorkState, type EncodedWorkState } from '../../legacy/state/codec';
import { createInitialState } from '../../legacy/state/initial';
import { transition } from '../../legacy/state/transition';
import { isWorkspaceToken, type WorkspaceAssetBinding } from '../../workspace/asset-transport';
import { requireLegacyCulture } from '../legacy-culture';
import { createPreferences } from '../preferences/service';
import { WorkspaceNotFound, type Principal, type WorkspaceOwnership } from './access';
import { advanceWorkspaceUi } from './ui-state';

const engineVersion = '1';
const maxStateBytes = 16 * 1024 * 1024;
const workspaceIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type StoredWorkspace = WorkspaceOwnership & WorkspaceAssetBinding & {
  revision: number;
  lastOperationSequence: number;
  state: WorkState;
  codecVersion: number;
  stateSchemaVersion: number;
  engineVersion: string;
  catalogRevision: string;
  preferenceVersion: number | null;
  lastActivityAt: Date;
  expiresAt: Date;
};

type Row = {
  id: string; user_id: string; session_id: string; tab_id: string;
  binding_revision: string; recovery_generation: string; revision: string;
  last_operation_sequence: string;
  last_resume_request: { id: string; fingerprint: string } | null;
  encoded_state: EncodedWorkState; codec_version: number; state_schema_version: number;
  engine_version: string; catalog_revision: string; preference_version: string | null;
  last_activity_at: Date; expires_at: Date;
};
type Activity = Pick<Row, 'last_activity_at' | 'expires_at'>;

export class WorkspaceStoreError extends Error {
  readonly status: number;

  constructor(readonly code: 'workspace-expired' | 'workspace-conflict' | 'workspace-incompatible') {
    super(code);
    this.status = code === 'workspace-expired' ? 410 : 409;
  }
}

function decode(row: Row, catalog: Catalog): StoredWorkspace {
  if (row.engine_version !== engineVersion || row.catalog_revision !== catalog.revision ||
      row.codec_version !== 1 || ![2, 3].includes(row.state_schema_version) ||
      row.encoded_state?.codecVersion !== row.codec_version || row.encoded_state.stateSchemaVersion !== row.state_schema_version) {
    throw new WorkspaceStoreError('workspace-incompatible');
  }
  let state: WorkState;
  try {
    state = decodeWorkState(row.encoded_state);
  } catch {
    throw new WorkspaceStoreError('workspace-incompatible');
  }
  const revision = Number(row.revision);
  if (!state.legacySession?.lastView || state.revision !== revision) throw new WorkspaceStoreError('workspace-incompatible');
  return {
    id: row.id, userId: row.user_id, sessionId: row.session_id, tabId: row.tab_id,
    bindingRevision: Number(row.binding_revision), recoveryGeneration: row.recovery_generation,
    revision, state, lastOperationSequence: Number(row.last_operation_sequence), codecVersion: row.codec_version, stateSchemaVersion: row.state_schema_version,
    engineVersion: row.engine_version, catalogRevision: row.catalog_revision,
    preferenceVersion: row.preference_version === null ? null : Number(row.preference_version),
    lastActivityAt: row.last_activity_at, expiresAt: row.expires_at,
  };
}

function encode(state: WorkState) {
  try {
    const payload = encodeWorkState(state);
    const json = JSON.stringify(payload);
    if (!state.legacySession?.lastView || Buffer.byteLength(json) > maxStateBytes) throw new Error();
    return { payload, json };
  } catch {
    throw new WorkspaceStoreError('workspace-incompatible');
  }
}

async function activity(client: PoolClient): Promise<Activity> {
  const { rows } = await client.query<Activity>(`
    SELECT ts AS last_activity_at, ts + interval '168 hours' AS expires_at
    FROM (SELECT date_trunc('milliseconds', clock_timestamp()) AS ts) AS clock
  `);
  return rows[0];
}

export function createWorkspaceStore({ database, catalog, checkAccess }: {
  database: Pool;
  catalog: Catalog;
  checkAccess: (principal: Principal, client: PoolClient) => Promise<void>;
}) {
  const { getPreferences } = createPreferences(database);

  async function transaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      const result = await run(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async function locked<T>(principal: Principal, id: string, tabId: string | null,
    run: (client: PoolClient, stored: StoredWorkspace, timestamp: Activity, receipt: Row['last_resume_request']) => Promise<T>,
    lockTimeoutMs?: number): Promise<T> {
    if (!workspaceIdPattern.test(id) || (tabId !== null && !isWorkspaceToken(tabId))) throw new WorkspaceNotFound();
    return transaction(async client => {
      if (lockTimeoutMs !== undefined) await client.query("SELECT set_config('lock_timeout', $1, true)", [String(lockTimeoutMs)]);
      const { rows: [row] } = await client.query<Row>(`
        SELECT * FROM workspaces WHERE id=$1 AND user_id=$2
          AND ($4::text IS NULL OR (session_id=$3 AND tab_id=$4)) FOR UPDATE
      `, [id, principal.userId, principal.sessionId, tabId]);
      await checkAccess(principal, client);
      if (!row) throw new WorkspaceNotFound();
      const timestamp = await activity(client);
      if (row.expires_at <= timestamp.last_activity_at) throw new WorkspaceStoreError('workspace-expired');
      return run(client, decode(row, catalog), timestamp, row.last_resume_request);
    });
  }

  async function commitState(client: PoolClient, stored: StoredWorkspace, timestamp: Activity,
    expectedRevision: number, next: WorkState, sequence = stored.lastOperationSequence): Promise<StoredWorkspace> {
    if (expectedRevision !== stored.revision || !Number.isSafeInteger(next.revision) || next.revision !== expectedRevision + 1) {
      throw new WorkspaceStoreError('workspace-conflict');
    }
    const { payload, json } = encode(next);
    const { rows: [row] } = await client.query<Row>(`
      UPDATE workspaces SET revision=$2, encoded_state=$3, codec_version=$4, state_schema_version=$5,
        last_activity_at=$6, expires_at=$7, last_operation_sequence=$8 WHERE id=$1 RETURNING *
    `, [stored.id, next.revision, json, payload.codecVersion, payload.stateSchemaVersion,
      timestamp.last_activity_at, timestamp.expires_at, sequence]);
    return decode(row, catalog);
  }

  return {
    withOwnedWorkspace<T>(principal: Principal, id: string, run: (
      client: PoolClient, workspace: StoredWorkspace, timestamp: Activity, receipt: Row['last_resume_request'],
    ) => Promise<T>): Promise<T> {
      return locked(principal, id, null, run);
    },
    async withLockedWorkspace<T>(principal: Principal, id: string, tabId: string, run: (
      client: PoolClient, stored: StoredWorkspace,
      commit: (expectedRevision: number, next: WorkState, sequence: number) => Promise<StoredWorkspace>,
    ) => Promise<T>, lockTimeoutMs?: number): Promise<T> {
      return locked(principal, id, tabId, (client, stored, timestamp) =>
        run(client, stored, (expected, next, sequence) => commitState(client, stored, timestamp, expected, next, sequence)), lockTimeoutMs);
    },

    async createWorkspace(principal: Principal, tabId: string): Promise<StoredWorkspace> {
      if (!isWorkspaceToken(tabId)) throw new WorkspaceNotFound();
      const preferences = await getPreferences(principal);
      const initial = createInitialState(requireLegacyCulture(process.env), { type: 'configure', ...preferences.values });
      const result = transition(initial, { type: 'select-route', routeId: initial.routeId }, catalog);
      advanceWorkspaceUi(initial, result);
      const { payload, json } = encode(result.state);
      return transaction(async client => {
        await checkAccess(principal, client);
        const timestamp = await activity(client);
        const { rows: [row] } = await client.query<Row>(`
          INSERT INTO workspaces (id, user_id, session_id, tab_id, recovery_generation, revision,
            encoded_state, codec_version, state_schema_version, engine_version, catalog_revision,
            preference_version, last_activity_at, expires_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *
        `, [randomUUID(), principal.userId, principal.sessionId, tabId, 'initial', result.state.revision,
          json, payload.codecVersion, payload.stateSchemaVersion, engineVersion, catalog.revision, preferences.version,
          timestamp.last_activity_at, timestamp.expires_at]);
        return decode(row, catalog);
      });
    },

    async readWorkspace<T>(principal: Principal, id: string, tabId: string, read: (stored: StoredWorkspace) => T): Promise<T> {
      return locked(principal, id, tabId, async (client, stored, timestamp) => {
        const result = read({ ...stored, lastActivityAt: timestamp.last_activity_at, expiresAt: timestamp.expires_at });
        await client.query('UPDATE workspaces SET last_activity_at=$2, expires_at=$3 WHERE id=$1',
          [id, timestamp.last_activity_at, timestamp.expires_at]);
        return result;
      });
    },

    async loadWorkspace(principal: Principal, id: string, tabId: string): Promise<StoredWorkspace> {
      return this.readWorkspace(principal, id, tabId, stored => stored);
    },

    async saveWorkspace(principal: Principal, id: string, expectedRevision: number, next: WorkState, tabId: string): Promise<StoredWorkspace> {
      return locked(principal, id, tabId, (client, stored, timestamp) =>
        commitState(client, stored, timestamp, expectedRevision, next));
    },
  };
}

export function requireCurrentBinding(workspace: StoredWorkspace, binding: WorkspaceAssetBinding) {
  if (workspace.tabId !== binding.tabId || workspace.bindingRevision !== binding.bindingRevision ||
      workspace.recoveryGeneration !== binding.recoveryGeneration) throw new WorkspaceNotFound();
}
