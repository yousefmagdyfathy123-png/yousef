import type { Pool, PoolClient } from 'pg';
import type { Principal } from '../auth/principal';
import { withPurchaseLock } from '../commerce/purchase-lock';

export class ClosureDenied extends Error {}

export async function lockCheckoutClosure(client: PoolClient, exclusive = false) {
  await client.query(exclusive
    ? 'SELECT pg_advisory_xact_lock(619247, 18)'
    : 'SELECT pg_advisory_xact_lock_shared(619247, 18)');
}

export async function getClosure(database?: Pool | PoolClient): Promise<{ shutdown_at: Date } | null> {
  const pool = database ?? (await import('../db/pool')).db;
  return (await pool.query<{ shutdown_at: Date }>('SELECT shutdown_at FROM service_closure')).rows[0] ?? null;
}

export async function announceClosure(actor: Principal, shutdownAt: Date, database?: Pool) {
  const pool = database ?? (await import('../db/pool')).db;
  await withPurchaseLock(pool, actor.userId, async client => {
    await lockCheckoutClosure(client, true);
    const eligible = await client.query(`
      SELECT 1 FROM "user" u JOIN user_roles r ON r.user_id=u.id AND r.role='admin'
      JOIN "session" s ON s."userId"=u.id LEFT JOIN account_access a ON a.user_id=u.id
      WHERE u.id=$1 AND s.id=$2 AND s."expiresAt">now() AND u."emailVerified" AND NOT coalesce(a.suspended,false)
    `, [actor.userId, actor.sessionId]);
    if (!eligible.rowCount || await getClosure(client)) throw new ClosureDenied();
    const result = await client.query(`
      WITH instant AS (SELECT clock_timestamp() AS announced),
      created AS (
        INSERT INTO service_closure(announced_at,shutdown_at)
        SELECT announced,$1 FROM instant WHERE $1::timestamptz >= announced + interval '1440 hours'
        RETURNING shutdown_at
      )
      INSERT INTO audit_events(actor_user_id,action,details)
      SELECT $2,'service.closure-announced',jsonb_build_object('shutdownAt',shutdown_at) FROM created
    `, [shutdownAt, actor.userId]);
    if (!result.rowCount) throw new ClosureDenied();
    await client.query(`
      INSERT INTO account_notice_outbox(recipient,kind,body)
      SELECT email,'closure',$1 FROM "user"
    `, ['Alfadata plans to end service on ' + shutdownAt.toISOString() + ' (UTC).']);
  });
}
