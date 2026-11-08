import type { Pool } from 'pg';
import { getPrincipal, type Principal } from '../auth/principal';
import { withPurchaseLock } from '../commerce/purchase-lock';

export class AdministrationDenied extends Error {}

export async function requireAdmin(request: Request): Promise<Principal> {
  const actor = await getPrincipal(request);
  if (!actor?.emailVerified || actor.suspended || actor.role !== 'admin') throw new AdministrationDenied();
  return actor;
}

export function createAdministration(database: Pool) {
  return {
    async grantAdmin(userId: string): Promise<void> {
      await withPurchaseLock(database, userId, async client => {
        if (!(await client.query('SELECT 1 FROM "user" WHERE id = $1', [userId])).rowCount) {
          throw new AdministrationDenied('Account does not exist');
        }
        await client.query(`
          WITH changed AS (
            INSERT INTO user_roles(user_id, role) VALUES ($1, 'admin')
            ON CONFLICT (user_id) DO UPDATE SET role = 'admin' WHERE user_roles.role <> 'admin'
            RETURNING user_id
          )
          INSERT INTO audit_events(subject_user_id, action) SELECT user_id, 'admin.operator-grant' FROM changed
        `, [userId]);
      });
    },

    async setSuspension(actorId: string, targetId: string, suspended: boolean): Promise<void> {
      if (actorId === targetId) throw new AdministrationDenied();
      const [first, second] = [actorId, targetId].sort();
      await withPurchaseLock(database, first, async client => {
        await client.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE', [second]);
        const eligible = await client.query(`
          SELECT 1 FROM "user" u JOIN user_roles r ON r.user_id = u.id AND r.role = 'admin'
          LEFT JOIN account_access a ON a.user_id = u.id
          WHERE u.id = $1 AND u."emailVerified" AND NOT coalesce(a.suspended, false)
          AND EXISTS (SELECT 1 FROM "user" WHERE id = $2)
        `, [actorId, targetId]);
        if (!eligible.rowCount) throw new AdministrationDenied();
        await client.query(`
          WITH changed AS (
            INSERT INTO account_access(user_id, suspended)
            SELECT $2, $3 WHERE $3 OR EXISTS (SELECT 1 FROM account_access WHERE user_id = $2)
            ON CONFLICT (user_id) DO UPDATE SET suspended = EXCLUDED.suspended
            WHERE account_access.suspended IS DISTINCT FROM EXCLUDED.suspended RETURNING user_id
          )
          INSERT INTO audit_events(actor_user_id, subject_user_id, action, details)
          SELECT $1, user_id, 'account.suspension', jsonb_build_object('suspended', $3::boolean) FROM changed
        `, [actorId, targetId, suspended]);
      });
    },
  };
}

export async function setSuspension(actorId: string, targetId: string, suspended: boolean): Promise<void> {
  await createAdministration((await import('../db/pool')).db).setSuspension(actorId, targetId, suspended);
}
