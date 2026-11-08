import type { Pool, PoolClient } from 'pg';
import type { Principal } from '../auth/principal';
import { proposeTrial, validDecision, type TrialLookup, type TrialRegistry } from './trial-registry/types';
import type { trialIdentity } from './trial-identity';

type Session = Pick<Principal, 'userId' | 'sessionId'>;
type Interval = { startedAt: string; endsAt: string };
export type Entitlement =
  | { reason: 'trial' | 'trial-expired'; startedAt: string; endsAt: string }
  | { reason: 'paid' | 'unauthenticated' | 'email-unverified' | 'suspended' | 'trial-not-started' | 'trial-review' };

type Account = {
  email: string;
  verified: boolean;
  active: boolean;
  admin: boolean;
  paid: boolean;
  suspended: boolean | null;
  trial_started_at: Date | null;
  trial_ends_at: Date | null;
  trial_decision_id: string | null;
  trial_schema_version: number | null;
  trial_scope: string | null;
  trial_status: string | null;
};

export function createEntitlements({ database, registry, identity, epoch, protect, now = () => new Date() }: {
  database: Pool;
  registry: TrialRegistry;
  identity: ReturnType<typeof trialIdentity>;
  epoch: string | undefined;
  protect: (request: Request, session: Session) => Promise<void>;
  now?: () => Date;
}) {
  function subject(email: string) {
    if (!identity || !epoch) return null;
    const id = identity.subjectId(email);
    return { id, scope: JSON.stringify([identity.registryNamespace, epoch, id]) };
  }

  async function read(db: Pool | PoolClient, userId: string, sessionId?: string): Promise<Account | undefined> {
    const { rows } = await db.query<Account>(`
      SELECT u.email, u."emailVerified" AS verified,
        EXISTS (SELECT 1 FROM "session" s WHERE s.id = $2 AND s."userId" = u.id
          AND s."expiresAt" > clock_timestamp()) AS active,
        EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'admin') AS admin,
        EXISTS (SELECT 1 FROM entitlement_grants g WHERE g.user_id = u.id AND g.revoked_at IS NULL AND g.state = 'active'
          AND g.granted_at <= $3) AS paid,
        a.suspended, a.trial_started_at, a.trial_ends_at, a.trial_decision_id,
        a.trial_schema_version, a.trial_scope, a.trial_status
      FROM "user" u LEFT JOIN account_access a ON a.user_id = u.id WHERE u.id = $1
    `, [userId, sessionId ?? null, now()]);
    return rows[0];
  }

  function interval(a: Account): Interval | null {
    if (!a.trial_started_at || !a.trial_ends_at) return null;
    return { startedAt: a.trial_started_at.toISOString(), endsAt: a.trial_ends_at.toISOString() };
  }

  function access(a?: Account): Entitlement {
    if (!a?.active) return { reason: 'unauthenticated' };
    if (a.suspended) return { reason: 'suspended' };
    if (!a.verified) return { reason: 'email-unverified' };
    if (a.paid) return { reason: 'paid' };
    const times = interval(a);
    const key = subject(a.email);
    if (times && key && a.trial_status === 'reconciled' && a.trial_scope === key.scope) {
      const time = now().getTime();
      if (time < Date.parse(times.startedAt)) return { reason: 'trial-review' };
      return { reason: time < Date.parse(times.endsAt) ? 'trial' : 'trial-expired', ...times };
    }
    return { reason: times || !key || a.trial_status === 'review' ? 'trial-review' : 'trial-not-started' };
  }

  async function lookup(id: string, canCreate?: () => Promise<boolean>): Promise<TrialLookup> {
    try {
      const result = await registry.lookup(id);
      if (result.status !== 'absent' || !canCreate) return result;
    } catch {
      return { status: 'unknown' };
    }
    if (!await canCreate()) return { status: 'unknown' };
    try {
      const result = await registry.createIfAbsent(id, proposeTrial(id, now()));
      if (result.status === 'found') return result;
    } catch {
      // The write may have committed. Resolve against the same subject.
    }
    try {
      return await registry.lookup(id);
    } catch {
      return { status: 'unknown' };
    }
  }

  async function transaction<T>(userId: string, work: (db: PoolClient) => Promise<T>): Promise<T> {
    const db = await database.connect();
    try {
      await db.query('BEGIN');
      await db.query('SELECT id FROM "user" WHERE id = $1 FOR UPDATE', [userId]);
      await db.query('SELECT user_id FROM account_access WHERE user_id = $1 FOR UPDATE', [userId]);
      const result = await work(db);
      await db.query('COMMIT');
      return result;
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    } finally {
      db.release();
    }
  }

  async function reconcile(db: PoolClient, userId: string, account: Account, scope: string | undefined,
    result: TrialLookup, id: string | undefined) {
    const decision = result.status === 'found' && id && validDecision(result.decision, id) ? result.decision : null;
    const times = interval(account);
    const matches = decision && (!times || (times.startedAt === decision.startedAt && times.endsAt === decision.endsAt)) &&
      (!account.trial_decision_id || account.trial_decision_id === decision.decisionId);
    if (matches && scope) {
      await db.query(`
        INSERT INTO account_access (user_id, trial_started_at, trial_ends_at, trial_decision_id, trial_schema_version, trial_scope, trial_status)
        VALUES ($1, $2, $3, $4, 1, $5, 'reconciled')
        ON CONFLICT (user_id) DO UPDATE SET trial_started_at = EXCLUDED.trial_started_at,
          trial_ends_at = EXCLUDED.trial_ends_at, trial_decision_id = EXCLUDED.trial_decision_id,
          trial_schema_version = 1, trial_scope = EXCLUDED.trial_scope, trial_status = 'reconciled'
      `, [userId, decision.startedAt, decision.endsAt, decision.decisionId, scope]);
      return 'reconciled';
    }
    await db.query(`
      INSERT INTO account_access (user_id, trial_status) VALUES ($1, 'review')
      ON CONFLICT (user_id) DO UPDATE SET trial_status = 'review'
    `, [userId]);
    return 'review';
  }

  return {
    async getEntitlement(session: Session, connection: Pool | PoolClient = database): Promise<Entitlement> {
      return access(await read(connection, session.userId, session.sessionId));
    },
    async enterVerifiedWorkspace(request: Request, session: Session): Promise<Entitlement> {
      await protect(request, session);
      const { userId, sessionId } = session;
      const initial = await read(database, userId, sessionId);
      const current = access(initial);
      if (!initial || (current.reason !== 'trial-review' && current.reason !== 'trial-not-started')) return current;
      const key = subject(initial.email);
      const canCreate = async () => {
        const account = await read(database, userId, sessionId);
        return !!account?.active && account.verified && !account.suspended && !account.paid &&
          account.email === initial.email && !account.trial_started_at && !account.trial_decision_id;
      };
      const result = key ? await lookup(key.id, canCreate)
        : { status: 'unknown' } as const;
      return transaction(userId, async db => {
        const account = await read(db, userId, sessionId);
        if (!account?.active || !account.verified || account.suspended || account.email !== initial.email) {
          return account && account.email !== initial.email ? { reason: 'trial-review' } : access(account);
        }
        // A concurrent entry may already have mirrored the decision while this lookup was unavailable.
        if (result.status === 'found' || account.trial_status !== 'reconciled' || account.trial_scope !== key?.scope) {
          await reconcile(db, userId, account, key?.scope, result, key?.id);
        }
        return access(await read(db, userId, sessionId));
      });
    },
    async recheckTrial(request: Request, actor: Session, userId: string): Promise<'denied' | 'review' | 'reconciled'> {
      await protect(request, actor);
      const isAdmin = (a?: Account) => a?.active && a.admin && a.verified && !a.suspended;
      if (!isAdmin(await read(database, actor.userId, actor.sessionId))) return 'denied';
      const target = await read(database, userId);
      if (!target?.verified) return 'denied';
      const key = subject(target.email);
      const result = key ? await lookup(key.id) : { status: 'unknown' } as const;
      return transaction(userId, async db => {
        if (!isAdmin(await read(db, actor.userId, actor.sessionId))) return 'denied';
        const account = await read(db, userId);
        if (!account?.verified || account.email !== target.email) return 'denied';
        const outcome = await reconcile(db, userId, account, key?.scope, result, key?.id);
        await db.query(`
          INSERT INTO audit_events (actor_user_id, subject_user_id, action, details)
          VALUES ($1, $2, 'trial.recheck', jsonb_build_object('outcome', $3::text))
        `, [actor.userId, userId, outcome]);
        return outcome;
      });
    },
  };
}
