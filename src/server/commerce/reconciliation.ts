import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { paymentEvents, recordPaymentReview } from './events';
import { toOrder, type OrderRow } from './orders';
import type { Settlement } from './payment-types';
import type { PaymentProvider } from './providers/types';
import { withPurchaseLock } from './purchase-lock';

const minute = 60_000;
const hour = 60 * minute;
export const recoveryDefaults = {
  batchSize: 20, timeoutMs: 5_000, leaseMs: 30_000, retryBaseMs: minute,
  retryCapMs: hour, maxFailures: 8, pendingMaxAgeMs: 7 * 24 * hour,
  pendingCadenceMs: 15 * minute, paidCadenceMs: 24 * hour, manualCooldownMs: minute,
  providerRequestsPerMinute: 120,
};
type Settings = typeof recoveryDefaults;
export function paymentRecoverySettings(env: NodeJS.ProcessEnv = process.env): Partial<Settings> {
  const settings: Partial<Settings> = {};
  for (const key of Object.keys(recoveryDefaults) as (keyof Settings)[]) {
    const name = 'PAYMENT_RECOVERY_' + key.replace(/[A-Z]/g, char => '_' + char).toUpperCase();
    const raw = env[name];
    if (raw !== undefined) {
      if (!/^[1-9]\d*$/.test(raw)) throw new Error('Invalid ' + name);
      settings[key] = Number(raw);
    }
  }
  return settings;
}
type RecoveryRow = OrderRow & {
  recovery_failures: number; recovery_paused: boolean; last_verified_at: Date | null;
};
export type RecoveryResult =
  | { kind: 'checked' | 'checking' | 'needs-review'; status: OrderRow['status']; checkoutUrl: string | null }
  | { kind: 'not-found' | 'rate-limited' | 'busy' };

export async function withProviderTimeout<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('Payment provider timeout'));
        }, ms);
      }),
      Promise.resolve().then(() => run(controller.signal)),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function claimProviderRequest(database: Pool, provider: PaymentProvider, limit: number) {
  const claimed = await database.query(`
    INSERT INTO payment_provider_quota(provider,environment,window_start,requests)
    VALUES ($1,$2,date_trunc('minute',clock_timestamp()),1)
    ON CONFLICT (provider,environment) DO UPDATE SET window_start=excluded.window_start,
      requests=CASE WHEN payment_provider_quota.window_start<excluded.window_start THEN 1
        ELSE payment_provider_quota.requests+1 END
    WHERE payment_provider_quota.window_start<excluded.window_start OR
      (payment_provider_quota.window_start=excluded.window_start AND payment_provider_quota.requests<$3)
  `, [provider.id, provider.environment, limit]);
  return claimed.rowCount === 1;
}

export function createReconciliation(database: Pool, resolve: (id: string) => PaymentProvider | undefined, overrides: Partial<Settings> = {}) {
  const settings = { ...recoveryDefaults, ...overrides };
  if (Object.values(settings).some(value => !Number.isSafeInteger(value) || value <= 0) ||
      settings.batchSize > 200 || settings.leaseMs <= settings.timeoutMs) throw new Error('Invalid payment recovery settings');
  const events = paymentEvents(database);

  async function processClaim(row: RecoveryRow, lease: string): Promise<RecoveryResult> {
    const provider = resolve(row.provider);
    let checkedSettlement: Exclude<Settlement, 'unknown'> | undefined;
    let invalid = false;
    if (provider?.recovery && provider.id === row.provider && provider.environment === row.environment) {
      if (!await claimProviderRequest(database, provider, settings.providerRequestsPerMinute)) {
        await database.query(`UPDATE orders SET recovery_lease=NULL,recovery_lease_until=NULL,
          recovery_due_at=CASE WHEN NOT recovery_paused AND status IN ('creation-unknown','pending','paid')
            THEN greatest(recovery_due_at,now()+interval '1 minute') ELSE recovery_due_at END
          WHERE id=$1 AND recovery_lease=$2`, [row.id, lease]);
        return { kind: 'rate-limited' };
      }
      const recovery = provider.recovery;
      const lookup = await withProviderTimeout(settings.timeoutMs, signal => recovery.lookupOrder(toOrder(row), signal))
        .catch(() => null);
      if (lookup?.kind === 'found') {
        const fact = lookup.observation;
        if (fact.orderId === row.id && fact.provider === row.provider && fact.environment === row.environment) {
          const result = await events.applyObservation(fact, 'authenticated-query', lease);
          if (result === 'lease-lost') return { kind: 'busy' };
          if (result === 'applied' && fact.settlement !== 'unknown') checkedSettlement = fact.settlement;
          invalid = result === 'needs-review';
        } else {
          invalid = true;
        }
      }
    }
    return withPurchaseLock(database, row.user_id, async client => {
      const { rows: [current] } = await client.query<RecoveryRow>(`
        SELECT * FROM orders WHERE id=$1 AND recovery_lease=$2 AND recovery_lease_until > clock_timestamp() FOR UPDATE
      `, [row.id, lease]);
      if (!current) return { kind: 'busy' };
      const terminal = ['failed', 'cancelled'].includes(current.status);
      const paid = current.status === 'paid';
      const success = checkedSettlement !== undefined && (!paid || checkedSettlement === 'paid');
      const failures = success ? 0 : current.recovery_failures + 1;
      const aged = !paid && !terminal && Date.now() - +current.created_at >= settings.pendingMaxAgeMs;
      const paused = !terminal && (current.recovery_paused || invalid || aged || failures >= settings.maxFailures);
      const delay = success ? (paid ? settings.paidCadenceMs : settings.pendingCadenceMs)
        : Math.min(settings.retryCapMs, settings.retryBaseMs * 2 ** Math.min(failures - 1, 30));
      await client.query(`UPDATE orders SET recovery_lease=NULL,recovery_lease_until=NULL,
        recovery_failures=$2,recovery_paused=$3,recovery_due_at=$4,
        last_verified_at=CASE WHEN $5 THEN now() ELSE last_verified_at END WHERE id=$1`,
      [row.id, failures, paused, paused || terminal ? null : new Date(Date.now() + delay), success]);
      if (paused) {
        await recordPaymentReview(client, row.id, paid ? 'paid-review-overdue' : 'checkout-review-overdue');
      } else if (success) {
        await client.query(`UPDATE payment_review_cases SET resolved_at=now() WHERE order_id=$1
          AND reason IN ('paid-review-overdue','checkout-review-overdue') AND resolved_at IS NULL`, [row.id]);
      }
      return { kind: paused ? 'needs-review' : success || terminal ? 'checked' : 'checking',
        status: current.status, checkoutUrl: toOrder(current).checkoutUrl };
    });
  }

  async function reconcileOrder(orderId: string, trigger: 'scheduled' | 'manual', owner?: string): Promise<RecoveryResult> {
    if (trigger === 'manual' && !owner) return { kind: 'not-found' };
    const lease = randomUUID();
    const { rows: [row] } = await database.query<RecoveryRow>(`
      UPDATE orders SET recovery_lease=$2,recovery_lease_until=now()+$3*interval '1 millisecond',
        last_manual_check_at=CASE WHEN $4 THEN now() ELSE last_manual_check_at END
      WHERE id=$1 AND (recovery_lease_until IS NULL OR recovery_lease_until<=now())
        AND CASE WHEN $4 THEN user_id=$5 AND
          (last_manual_check_at IS NULL OR last_manual_check_at<=now()-$6*interval '1 millisecond')
        ELSE NOT recovery_paused AND recovery_due_at<=now() END
      RETURNING *
    `, [orderId, lease, settings.leaseMs, trigger === 'manual', owner ?? null, settings.manualCooldownMs]);
    if (row) return processClaim(row, lease);
    const existing = await database.query(`
      SELECT last_manual_check_at > now()-$3*interval '1 millisecond' AS limited
      FROM orders WHERE id=$1 AND ($2::text IS NULL OR user_id=$2)
    `, [orderId, owner ?? null, settings.manualCooldownMs]);
    if (!existing.rowCount) return { kind: 'not-found' };
    return { kind: trigger === 'manual' && existing.rows[0].limited ? 'rate-limited' : 'busy' };
  }

  async function reconcileDueOrders() {
    const results: RecoveryResult[] = [];
    for (let count = 0; count < settings.batchSize; count++) {
      const lease = randomUUID();
      const { rows: [row] } = await database.query<RecoveryRow>(`
        WITH due AS (
          SELECT id FROM orders WHERE NOT recovery_paused AND recovery_due_at<=now()
            AND (recovery_lease_until IS NULL OR recovery_lease_until<=now())
          ORDER BY recovery_due_at,id LIMIT 1 FOR UPDATE SKIP LOCKED
        )
        UPDATE orders o SET recovery_lease=$1,recovery_lease_until=now()+$2*interval '1 millisecond'
        FROM due WHERE o.id=due.id RETURNING o.*
      `, [lease, settings.leaseMs]);
      if (!row) break;
      results.push(await processClaim(row, lease));
    }
    return { claimed: results.length, results };
  }

  return { reconcileOrder, reconcileDueOrders };
}

export async function resumePaymentReview(database: Pool, orderId: string, actor: string) {
  const { rows: [order] } = await database.query<{ user_id: string }>('SELECT user_id FROM orders WHERE id=$1', [orderId]);
  if (!order) return false;
  return withPurchaseLock(database, order.user_id, async client => {
    const allowed = await client.query(`
      SELECT 1 FROM user_roles r JOIN "user" u ON u.id=r.user_id
      LEFT JOIN account_access a ON a.user_id=u.id
      WHERE r.user_id=$1 AND r.role='admin' AND u."emailVerified" AND NOT coalesce(a.suspended,false)
    `, [actor]);
    if (!allowed.rowCount) return false;
    const updated = await client.query(`UPDATE orders SET recovery_paused=false,recovery_failures=0,recovery_due_at=now()
      WHERE id=$1 AND recovery_paused AND status IN ('creation-unknown','pending','paid')`, [orderId]);
    if (!updated.rowCount) return false;
    await client.query(`INSERT INTO audit_events(actor_user_id,subject_user_id,action,details)
      VALUES ($1,$2,'payment-review-resumed',jsonb_build_object('orderId',$3::text))`, [actor, order.user_id, orderId]);
    return true;
  });
}
