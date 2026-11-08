import { getClosure, lockCheckoutClosure } from '../account/closure';
import type { PolicyAcknowledgement } from './purchase-policy';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { Currency, Price } from './pricing';
import type { PaymentProvider } from './providers/types';
import { withPurchaseLock } from './purchase-lock';

export { withPurchaseLock } from './purchase-lock';

type Status = 'creation-unknown' | 'pending' | 'failed' | 'cancelled' | 'paid';
export type Order = {
  id: string; quoteId: string; userId: string; price: Price;
  provider: string; environment: 'test' | 'live'; status: Status;
  providerReference: string | null; checkoutUrl: string | null;
  checkoutAttemptKey: string; createdAt: Date;
};
export type OrderRow = {
  id: string; quote_id: string; user_id: string; currency: Currency; minor_units: number;
  provider: string; environment: Order['environment']; status: Status;
  provider_reference: string | null; checkout_url: string | null; created_at: Date;
};

export function toOrder(row: OrderRow): Order {
  return {
    id: row.id, quoteId: row.quote_id, userId: row.user_id,
    price: { currency: row.currency, minorUnits: row.minor_units },
    provider: row.provider, environment: row.environment, status: row.status,
    providerReference: row.provider_reference,
    checkoutUrl: row.status === 'pending' ? row.checkout_url : null,
    checkoutAttemptKey: row.id, createdAt: row.created_at,
  };
}

export class CheckoutUnavailable extends Error {
  constructor(readonly reason: 'account-ineligible' | 'quote-not-found' | 'lifetime-active' | 'currency-unavailable' | 'service-closure' | 'policy-required',
    readonly price?: Price) {
    super(reason);
  }
}

function validCheckout(result: { reference: string; url: string }) {
  if (!result?.reference || result.reference.length > 512 || !result.url || result.url.length > 4096) return false;
  try {
    const url = new URL(result.url);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function createOrders(database: Pool) {
  async function createOrder(userId: string, quoteId: string, idempotencyKey: string, provider: PaymentProvider, acknowledgement?: PolicyAcknowledgement): Promise<Order> {
    const reservation = await withPurchaseLock(database, userId, async client => {
      const account = await client.query<{ eligible: boolean }>(`
        SELECT u."emailVerified" AND NOT coalesce(a.suspended, false) AS eligible
        FROM "user" u LEFT JOIN account_access a ON a.user_id = u.id WHERE u.id = $1
      `, [userId]);
      if (!account.rows[0]?.eligible) throw new CheckoutUnavailable('account-ineligible');

      const quote = await client.query<{ currency: Currency; minor_units: number; status: string }>(
        'SELECT currency, minor_units, status FROM quotes WHERE id = $1 AND user_id = $2', [quoteId, userId],
      );
      const snapshot = quote.rows[0];
      if (!snapshot) throw new CheckoutUnavailable('quote-not-found');

      const replay = await client.query<OrderRow>(`
        SELECT o.* FROM checkout_request_keys k JOIN orders o ON o.id = k.order_id
        WHERE k.user_id = $1 AND k.idempotency_key = $2
      `, [userId, idempotencyKey]);
      const grant = await client.query(
        "SELECT 1 FROM entitlement_grants WHERE user_id = $1 AND revoked_at IS NULL AND state = 'active' AND granted_at <= now() LIMIT 1", [userId],
      );
      const previous = replay.rows[0];
      if (grant.rowCount && (!previous || previous.status === 'pending' || previous.status === 'creation-unknown')) {
        throw new CheckoutUnavailable('lifetime-active');
      }
      if (previous) return { row: previous, dispatch: false };

      // An older quote may be submitted again after its order closed. Bind the key to
      // that order so retries can never turn into a fresh purchase on a different quote.
      const existing = await client.query<OrderRow>(`
        SELECT * FROM orders
        WHERE user_id = $1 AND (quote_id = $2 OR status IN ('creation-unknown', 'pending'))
        ORDER BY (quote_id = $2) DESC LIMIT 1
      `, [userId, quoteId]);
      let row = existing.rows[0];
      const dispatch = !row;
      if (dispatch) {
        await lockCheckoutClosure(client);
        if (await getClosure(client)) throw new CheckoutUnavailable('service-closure');
        if (provider.environment === 'live' && !acknowledgement) throw new CheckoutUnavailable('policy-required');
        if (snapshot.status !== 'open') throw new CheckoutUnavailable('quote-not-found');
        const price = { currency: snapshot.currency, minorUnits: snapshot.minor_units };
        if (!provider.currencies.has(price.currency)) throw new CheckoutUnavailable('currency-unavailable', price);
        const created = await client.query<OrderRow>(`
          INSERT INTO orders(id,quote_id,user_id,currency,minor_units,provider,environment,status,
                             idempotency_key,checkout_claimed_at,recovery_due_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,'creation-unknown',$8,now(),now() + interval '1 minute')
          RETURNING *
        `, [randomUUID(), quoteId, userId, price.currency, price.minorUnits, provider.id, provider.environment, idempotencyKey]);
        row = created.rows[0];
        if (acknowledgement) {
          await client.query(`
            INSERT INTO order_policy_acceptances(order_id,user_id,version,content_hash) VALUES ($1,$2,$3,$4)
          `, [row.id, userId, acknowledgement.version, acknowledgement.hash]);
        }
        await client.query("UPDATE quotes SET status = 'consumed' WHERE id = $1", [quoteId]);
      }
      await client.query('INSERT INTO checkout_request_keys(user_id,idempotency_key,order_id) VALUES ($1,$2,$3)',
        [userId, idempotencyKey, row.id]);
      return { row, dispatch };
    });

    const order = toOrder(reservation.row);
    if (!reservation.dispatch) return order;

    // The committed claim is single-use. A lost response or process crash leaves
    // the attempt eligible for lookup, with the same merchant reference.
    let result: Awaited<ReturnType<PaymentProvider['createCheckout']>> | undefined;
    try {
      const response = await provider.createCheckout(order);
      if (validCheckout(response)) result = response;
    } catch {
      // The provider may have created the checkout before the connection failed.
    }
    return withPurchaseLock(database, userId, async client => {
      if (result) {
        await client.query(`
          UPDATE orders SET status = 'pending', provider_reference = $2, checkout_url = $3
          WHERE id = $1 AND status IN ('creation-unknown', 'pending')
            AND (provider_reference IS NULL OR provider_reference = $2)
        `, [order.id, result.reference, result.url]);
      }
      const current = await client.query<OrderRow>('SELECT * FROM orders WHERE id = $1', [order.id]);
      return toOrder(current.rows[0]);
    });
  }

  return { createOrder };
}

export async function createOrder(userId: string, quoteId: string, idempotencyKey: string, provider: PaymentProvider, acknowledgement: PolicyAcknowledgement) {
  const { db } = await import('../db/pool');
  return createOrders(db).createOrder(userId, quoteId, idempotencyKey, provider, acknowledgement);
}
