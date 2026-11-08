import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { withPurchaseLock } from '../commerce/purchase-lock';
import type { Principal } from '../auth/principal';
import { configuredDeletionCalendar, deletionDeadline } from './calendar';

export class DeletionUnavailable extends Error {}

type PendingDeletion = { requested_at: Date; due_at: Date };

async function pendingDeletion(database: Pool | PoolClient, userId: string): Promise<PendingDeletion | null> {
  const { rows } = await database.query<PendingDeletion>(
    'SELECT requested_at,due_at FROM deletion_requests WHERE user_id=$1 AND completed_at IS NULL', [userId],
  );
  return rows[0] ?? null;
}

export async function getPendingDeletion(principal: Principal): Promise<PendingDeletion | null> {
  if (!principal.emailVerified || principal.suspended) return null;
  return pendingDeletion((await import('../db/pool')).db, principal.userId);
}

export async function requestAccountDeletion(principal: Principal, database?: Pool) {
  const pool = database ?? (await import('../db/pool')).db;
  return withPurchaseLock(pool, principal.userId, async client => {
    const eligible = await client.query(`
      SELECT 1 FROM "user" u JOIN "session" s ON s."userId"=u.id
      LEFT JOIN account_access a ON a.user_id=u.id
      WHERE u.id=$1 AND s.id=$2 AND s."expiresAt">now() AND u."emailVerified" AND NOT coalesce(a.suspended,false)
    `, [principal.userId, principal.sessionId]);
    if (!eligible.rowCount) throw new DeletionUnavailable();
    const existing = await pendingDeletion(client, principal.userId);
    if (existing) return existing;
    const now = (await client.query<{ time: Date }>('SELECT clock_timestamp() AS time')).rows[0].time;
    const calendar = configuredDeletionCalendar();
    const deadline = calendar && deletionDeadline(calendar, now);
    if (!deadline) throw new DeletionUnavailable();
    const { rows } = await client.query<{ requested_at: Date; due_at: Date }>(`
      INSERT INTO deletion_requests(id,user_id,requested_at,due_at) VALUES($1,$2,$3,$4) RETURNING requested_at,due_at
    `, [randomUUID(), principal.userId, now, deadline]);
    return rows[0];
  });
}

export async function reviewDeletion(actor: Principal, requestId: string) {
  const { db } = await import('../db/pool');
  return Boolean((await db.query(`
    WITH reviewed AS (
      UPDATE deletion_requests d SET reviewed_at=clock_timestamp(),reviewed_by=$1
      WHERE d.id=$2 AND d.reviewed_at IS NULL AND d.completed_at IS NULL AND EXISTS (
        SELECT 1 FROM "user" u JOIN user_roles r ON r.user_id=u.id AND r.role='admin'
        JOIN "session" s ON s."userId"=u.id
        LEFT JOIN account_access a ON a.user_id=u.id
        WHERE u.id=$1 AND s.id=$3 AND s."expiresAt">now() AND u."emailVerified" AND NOT coalesce(a.suspended,false)
      ) RETURNING user_id,id
    )
    INSERT INTO audit_events(actor_user_id,subject_user_id,action,details)
    SELECT $1,user_id,'account.deletion-reviewed',jsonb_build_object('requestId',id) FROM reviewed
  `, [actor.userId, requestId, actor.sessionId])).rowCount);
}

/**
 * The approved processor runs inside this transaction. Its implementation owns
 * workspace removal, permitted financial/trial exceptions and the restore fence.
 * There is no production processor until that policy is approved.
 */
export async function completeReviewedDeletion(
  database: Pool,
  requestId: string,
  processApprovedDeletion: (client: PoolClient, userId: string) => Promise<void>,
): Promise<boolean> {
  const lookup = await database.query<{ user_id: string | null }>(
    'SELECT user_id FROM deletion_requests WHERE id=$1 AND reviewed_at IS NOT NULL AND completed_at IS NULL',
    [requestId],
  );
  const userId = lookup.rows[0]?.user_id;
  if (!userId) return false;

  return withPurchaseLock(database, userId, async client => {
    const result = await client.query<{ email: string }>(`
      SELECT u.email FROM deletion_requests d JOIN "user" u ON u.id=d.user_id
      WHERE d.id=$1 AND d.user_id=$2 AND d.reviewed_at IS NOT NULL AND d.completed_at IS NULL
      FOR UPDATE OF d
    `, [requestId, userId]);
    const email = result.rows[0]?.email;
    if (!email) return false;
    await processApprovedDeletion(client, userId);
    const residual = await client.query(`
      SELECT 1 WHERE EXISTS (SELECT 1 FROM "session" WHERE "userId"=$1)
        OR EXISTS (SELECT 1 FROM "account" WHERE "userId"=$1)
        OR EXISTS (SELECT 1 FROM preferences WHERE user_id=$1)
        OR EXISTS (SELECT 1 FROM user_roles WHERE user_id=$1)
        OR EXISTS (SELECT 1 FROM entitlement_grants WHERE user_id=$1 AND state='active' AND revoked_at IS NULL)
        OR EXISTS (SELECT 1 FROM "user" u LEFT JOIN account_access a ON a.user_id=u.id
          WHERE u.id=$1 AND (u.email=$2 OR u."emailVerified" OR NOT coalesce(a.suspended,false)))
    `, [userId, email]);
    if (residual.rowCount) throw new DeletionUnavailable('Account access or personal data remains');
    await client.query('UPDATE deletion_requests SET completed_at=clock_timestamp() WHERE id=$1', [requestId]);
    await client.query(`
      INSERT INTO account_notice_outbox(recipient,kind,body) VALUES($1,'deletion-completed',$2)
    `, [email, 'Your Alfadata account deletion request has been processed.']);
    return true;
  });
}
