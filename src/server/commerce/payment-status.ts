import 'server-only';
import { db } from '../db/pool';
import type { Principal } from '../auth/principal';

export async function accountPayments(principal: Principal) {
  const orders = await db.query<{
    id: string; status: string; currency: string; minor_units: number; refunded: number;
    state: string | null; disputed: boolean; review: boolean; environment: string;
  }>(`SELECT o.id,o.status,o.currency,o.minor_units,o.environment,g.state,
    coalesce((SELECT sum(r.minor_units)::integer FROM payment_refunds r WHERE r.order_id=o.id),0) AS refunded,
    EXISTS (SELECT 1 FROM payment_disputes d WHERE d.order_id=o.id AND d.state IN ('open','lost')) AS disputed,
    EXISTS (SELECT 1 FROM payment_review_cases r WHERE r.order_id=o.id AND r.resolved_at IS NULL) AS review
    FROM orders o LEFT JOIN entitlement_grants g ON g.order_id=o.id WHERE o.user_id=$1
    ORDER BY o.created_at DESC, o.id LIMIT 50`, [principal.userId]);
  return { orders: orders.rows };
}
