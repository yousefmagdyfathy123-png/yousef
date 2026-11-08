import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll } from 'vitest';
import { migrate } from '../../tools/db/migrate';
import { createOrders } from '../../src/server/commerce/orders';
import { getOrCreateQuote } from '../../src/server/commerce/pricing';
import { createTestProvider } from '../../src/server/commerce/providers/test';
import type { PaymentEvent, PaymentObservation } from '../../src/server/commerce/payment-types';

export const secret = 'local-payment-fixture-secret-12345';
export function fixtureDatabase() {
  const url = process.env.ALFADATA_TEST_DATABASE_URL;
  if (!url) throw new Error('Use npm run test:integration');
  const database = new Pool({ connectionString: url });
  beforeAll(async () => { await migrate(database); });
  afterAll(() => database.end());
  return database;
}

export async function purchase(database: Pool, loseCreateResponse = false, userId = randomUUID()) {
  await database.query(`INSERT INTO "user"(id,name,email,"emailVerified") VALUES ($1,$1,$2,true)
    ON CONFLICT (id) DO NOTHING`, [userId, userId + '@example.invalid']);
  const fixture = createTestProvider(secret, { loseCreateResponse });
  const quote = await getOrCreateQuote(userId, database);
  const order = await createOrders(database).createOrder(userId, quote.id, randomUUID(), fixture.provider);
  const observation = fixture.observation(order.id);
  return { fixture, order, observation };
}

export function settlement(fact: PaymentObservation, kind: 'pending' | 'failed' | 'paid' | 'cancelled' = 'paid'): PaymentEvent {
  return {
    id: randomUUID(), provider: fact.provider, environment: fact.environment, orderId: fact.orderId,
    userId: fact.userId, providerReference: fact.providerReference, price: fact.price, kind, providerTime: new Date(),
  };
}

export async function grant(database: Pool, orderId: string) {
  return (await database.query('SELECT state FROM entitlement_grants WHERE order_id=$1', [orderId])).rows[0]?.state;
}
