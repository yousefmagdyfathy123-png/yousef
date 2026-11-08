import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { withPurchaseLock } from './purchase-lock';
import type { OrderRow } from './orders';
import { grantState, mergeDispute } from './payment-policy';
import type { DisputeState, PaymentEvent, PaymentObservation } from './payment-types';

type PaymentRow = OrderRow & { settlement_at: Date | null; recovery_lease: string | null; recovery_lease_until: Date | null };
type Result = 'applied' | 'duplicate' | 'unmatched' | 'needs-review' | 'lease-lost';
type Input =
  | { source: 'webhook'; event: PaymentEvent }
  | { source: 'authenticated-query' | 'authenticated-history'; observation: PaymentObservation; lease?: string; recordId?: string };
class FactConflict extends Error {}

export function recordPaymentReview(client: PoolClient, orderId: string, reason: string) {
  return client.query(`INSERT INTO payment_review_cases(order_id,reason) VALUES ($1,$2)
    ON CONFLICT (order_id,reason) DO UPDATE SET resolved_at = NULL`, [orderId, reason]);
}

function normalize(event: PaymentEvent): PaymentObservation {
  const { id: _id, providerTime, kind, ...identity } = event;
  const disputeStates = { 'dispute-opened': 'open', 'dispute-won': 'won', 'dispute-lost': 'lost' } as const;
  if ('disputeId' in event) return {
    ...identity, observedAt: providerTime, settlement: 'unknown', refunds: [],
    disputes: [{ id: event.disputeId, status: disputeStates[event.kind] }],
  };
  if ('refund' in event) return {
    ...identity, observedAt: providerTime, settlement: 'unknown', refunds: [event.refund], disputes: [],
  };
  return { ...identity, observedAt: providerTime, settlement: kind as PaymentObservation['settlement'], refunds: [], disputes: [] };
}

function validId(id: string) {
  return typeof id === 'string' && id.length <= 512 && /^[!-~]+$/.test(id);
}

function validate(order: PaymentRow, fact: PaymentObservation) {
  if (order.user_id !== fact.userId || order.provider !== fact.provider || order.environment !== fact.environment ||
      order.currency !== fact.price?.currency || order.minor_units !== fact.price?.minorUnits ||
      !validId(fact.providerReference) || !Array.isArray(fact.refunds) || !Array.isArray(fact.disputes) ||
      !(fact.observedAt instanceof Date) || !Number.isFinite(+fact.observedAt) ||
      !['unknown', 'pending', 'paid', 'failed', 'cancelled'].includes(fact.settlement)) {
    throw new FactConflict('order-mismatch');
  }
}

async function applyFacts(client: PoolClient, order: PaymentRow, fact: PaymentObservation) {
  const identity = [order.provider, order.environment, order.id];
  for (const refund of fact.refunds) {
    if (!refund || !validId(refund.id) || refund.amount?.currency !== order.currency ||
        !Number.isInteger(refund.amount.minorUnits) || refund.amount.minorUnits <= 0 ||
        refund.amount.minorUnits > order.minor_units) throw new FactConflict('invalid-refund');
    await client.query(`INSERT INTO payment_refunds(provider,environment,order_id,id,minor_units)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [...identity, refund.id, refund.amount.minorUnits]);
    const { rows: [stored] } = await client.query(`
      SELECT order_id, minor_units FROM payment_refunds WHERE provider=$1 AND environment=$2 AND id=$3
    `, [order.provider, order.environment, refund.id]);
    if (stored.order_id !== order.id || stored.minor_units !== refund.amount.minorUnits) throw new FactConflict('conflicting-refund');
  }
  for (const dispute of fact.disputes) {
    if (!dispute || !validId(dispute.id) || !['open', 'won', 'lost'].includes(dispute.status)) throw new FactConflict('invalid-dispute');
    await client.query(`INSERT INTO payment_disputes(provider,environment,order_id,id,state)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [...identity, dispute.id, dispute.status]);
    const keys = [order.provider, order.environment, dispute.id];
    const { rows: [stored] } = await client.query<{ order_id: string; state: DisputeState }>(`
      SELECT order_id,state FROM payment_disputes WHERE provider=$1 AND environment=$2 AND id=$3
    `, keys);
    const state = mergeDispute(stored.state, dispute.status);
    if (stored.order_id !== order.id || !state) throw new FactConflict('conflicting-dispute');
    if (state !== stored.state) await client.query(`
      UPDATE payment_disputes SET state=$4 WHERE provider=$1 AND environment=$2 AND id=$3
    `, [...keys, state]);
  }
  const { rows: [refunds] } = await client.query<{ total: string }>(
    'SELECT coalesce(sum(minor_units),0) AS total FROM payment_refunds WHERE order_id=$1', [order.id],
  );
  const total = Number(refunds.total);
  if (total > order.minor_units) throw new FactConflict('refund-exceeds-purchase');
  const { rows: disputes } = await client.query<{ state: DisputeState }>(
    'SELECT state FROM payment_disputes WHERE order_id=$1', [order.id],
  );

  const previous = order.status;
  let status = previous;
  const current = !order.settlement_at || fact.observedAt >= order.settlement_at;
  if (fact.settlement === 'paid') {
    status = 'paid';
    if (previous === 'failed' || previous === 'cancelled') await recordPaymentReview(client, order.id, 'paid-after-closure');
  } else if (current && (previous === 'creation-unknown' || previous === 'pending') && fact.settlement !== 'unknown') {
    status = fact.settlement;
  } else if (current && fact.settlement !== 'unknown' && fact.settlement !== previous &&
      (previous === 'failed' || previous === 'cancelled' ||
       (previous === 'paid' && fact.settlement !== 'pending'))) {
    await recordPaymentReview(client, order.id, 'conflicting-settlement');
  }
  const terminal = status === 'failed' || status === 'cancelled';
  let checkoutUrl = order.checkout_url;
  if (status === 'pending' && fact.checkoutUrl) {
    try {
      const url = new URL(fact.checkoutUrl);
      if (fact.checkoutUrl.length <= 4096 && url.protocol === 'https:' && !url.username && !url.password) {
        checkoutUrl = fact.checkoutUrl;
      }
    } catch {
      // A malformed resume URL supplies no usable link.
    }
  }
  const newlyPaid = status === 'paid' && previous !== 'paid';
  await client.query(`UPDATE orders SET status=$2, provider_reference=$3,
    settlement_at=CASE WHEN $4 THEN greatest(settlement_at,$5::timestamptz) ELSE settlement_at END,
    checkout_url=$6,
    recovery_due_at=CASE WHEN $7 THEN now() WHEN $8 THEN NULL ELSE recovery_due_at END,
    recovery_paused=CASE WHEN $7 THEN false ELSE recovery_paused END,
    recovery_failures=CASE WHEN $7 THEN 0 ELSE recovery_failures END
    WHERE id=$1`, [order.id, status, fact.providerReference, status !== previous ||
      (fact.settlement === status && current), fact.observedAt, status === 'pending' ? checkoutUrl : null, newlyPaid, terminal]);

  if (status !== 'paid') return;
  const state = grantState(order.minor_units, total, disputes.map(dispute => dispute.state));
  await client.query(`INSERT INTO entitlement_grants(id,user_id,order_id,state,revoked_at)
    SELECT $1,$2,$3,$4,CASE WHEN $4='revoked' THEN now() ELSE NULL END
    WHERE $5 OR EXISTS (SELECT 1 FROM entitlement_grants WHERE order_id=$3)
    ON CONFLICT (order_id) DO UPDATE SET
      state=CASE WHEN entitlement_grants.revoked_at IS NOT NULL THEN 'revoked' ELSE excluded.state END,
      revoked_at=coalesce(entitlement_grants.revoked_at,excluded.revoked_at)`,
  [randomUUID(), order.user_id, order.id, state, fact.settlement === 'paid']);
  if (newlyPaid && (await client.query(
    "SELECT 1 FROM orders WHERE user_id=$1 AND id<>$2 AND status='paid' LIMIT 1", [order.user_id, order.id],
  )).rowCount) await recordPaymentReview(client, order.id, 'multiple-paid-orders');
}

export function paymentEvents(database: Pool) {
  async function apply(input: Input): Promise<Result> {
    const fact = input.source === 'webhook' ? normalize(input.event) : input.observation;
    const { rows: [owner] } = await database.query<{ user_id: string }>('SELECT user_id FROM orders WHERE id=$1', [fact.orderId]);
    if (!owner) return 'unmatched';
    return withPurchaseLock(database, owner.user_id, async client => {
      const { rows: [order] } = await client.query<PaymentRow>('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [fact.orderId]);
      if (input.source !== 'webhook' && input.lease &&
          (order.recovery_lease !== input.lease || !order.recovery_lease_until || +order.recovery_lease_until <= Date.now())) {
        return 'lease-lost';
      }
      await client.query('SAVEPOINT verified_facts');
      try {
        validate(order, fact);
        if (order.provider_reference && order.provider_reference !== fact.providerReference) {
          throw new FactConflict('reference-mismatch');
        }
        const sameReference = await client.query(`
          SELECT 1 FROM orders WHERE provider=$1 AND environment=$2 AND provider_reference=$3 AND id<>$4
        `, [fact.provider, fact.environment, fact.providerReference, order.id]);
        if (sameReference.rowCount) throw new FactConflict('reference-already-linked');
        if (input.source === 'authenticated-history' && input.recordId) {
          const inserted = await client.query(`INSERT INTO payment_history_records(provider,environment,id,result)
            VALUES ($1,$2,$3,'applied') ON CONFLICT DO NOTHING`, [order.provider, order.environment, input.recordId]);
          if (!inserted.rowCount) return 'duplicate';
        }
        if (input.source === 'webhook') {
          if (!validId(input.event.id)) throw new FactConflict('invalid-event-id');
          const payload = JSON.stringify({
            providerReference: fact.providerReference, price: fact.price, refunds: fact.refunds, disputes: fact.disputes,
          });
          const inserted = await client.query(`INSERT INTO provider_events(provider,environment,id,order_id,kind,payload,provider_time)
            VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`, [
            order.provider, order.environment, input.event.id, order.id, input.event.kind,
            payload, fact.observedAt,
          ]);
          if (!inserted.rowCount) {
            const { rows: [existing] } = await client.query(
              `SELECT order_id,kind,(payload=$4::jsonb OR NOT (payload ? 'providerReference')) AS same_facts
               FROM provider_events WHERE provider=$1 AND environment=$2 AND id=$3`,
              [order.provider, order.environment, input.event.id, payload],
            );
            if (existing.order_id !== order.id || existing.kind !== input.event.kind ||
                !existing.same_facts) {
              throw new FactConflict('conflicting-event-id');
            }
            return 'duplicate';
          }
        }
        await applyFacts(client, order, fact);
        if (input.source !== 'webhook') {
          await client.query(`INSERT INTO audit_events(subject_user_id,action,details)
            VALUES ($1,$2,jsonb_build_object('orderId',$3::text,'settlement',$4::text))`,
          [order.user_id, input.source, order.id, fact.settlement]);
        }
        return 'applied';
      } catch (error) {
        const uniqueReference = (error as { constraint?: string }).constraint === 'orders_provider_environment_provider_reference_key';
        if (!(error instanceof FactConflict) && !uniqueReference) throw error;
        await client.query('ROLLBACK TO SAVEPOINT verified_facts');
        const reason = error instanceof FactConflict ? error.message : 'reference-already-linked';
        if (fact.settlement === 'paid' && ['reference-mismatch', 'reference-already-linked'].includes(reason)) {
          await client.query(`INSERT INTO payment_reference_conflicts
            (order_id,provider_reference,source,minor_units,currency,observed_at)
            VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
          [order.id, fact.providerReference, input.source, fact.price.minorUnits, fact.price.currency, fact.observedAt]);
        }
        await recordPaymentReview(client, order.id, reason);
        return 'needs-review';
      }
    });
  }
  return {
    applyVerifiedEvent: (event: PaymentEvent) => apply({ source: 'webhook', event }),
    applyObservation: (observation: PaymentObservation, source: 'authenticated-query' | 'authenticated-history', lease?: string, recordId?: string) =>
      apply({ source, observation, lease, recordId }),
  };
}

export async function applyVerifiedEvent(event: PaymentEvent) {
  const { db } = await import('../db/pool');
  return paymentEvents(db).applyVerifiedEvent(event);
}
