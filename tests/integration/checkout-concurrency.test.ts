import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { migrate } from '../../tools/db/migrate';
import { createOrders, withPurchaseLock } from '../../src/server/commerce/orders';
import { paymentEvents } from '../../src/server/commerce/events';
import { getOrCreateQuote } from '../../src/server/commerce/pricing';
import type { PaymentProvider } from '../../src/server/commerce/providers/types';

const database = new Pool({ connectionString: process.env.ALFADATA_TEST_DATABASE_URL });
const peer = new Pool({ connectionString: process.env.ALFADATA_TEST_DATABASE_URL });
beforeAll(async () => { await migrate(database); });
afterAll(async () => { await Promise.all([database.end(), peer.end()]); });

async function buyer() {
  const id = randomUUID();
  await database.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES ($1,$1,$2,true)', [id, id + '@example.invalid']);
  return { id, quote: await getOrCreateQuote(id, database) };
}

function gateway(createCheckout: PaymentProvider['createCheckout'], id = 'fixture'): PaymentProvider {
  return { id, environment: 'test', currencies: new Set(['USD']), createCheckout };
}

test('fresh keys and different providers converge on one attempt without holding a lock during IO', async () => {
  const { id, quote } = await buyer();
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<{ reference: string; url: string }>();
  const create = vi.fn(async () => { entered.resolve(); return release.promise; });
  const other = vi.fn(async () => { throw new Error('second provider dispatched'); });
  const first = createOrders(database).createOrder(id, quote.id, 'first', gateway(create));
  await entered.promise;
  try {
    const freshQuote = await getOrCreateQuote(id, peer);
    expect(freshQuote.id).not.toBe(quote.id);
    const checking = await createOrders(peer).createOrder(id, freshQuote.id, 'other', gateway(other, 'different'));
    expect(checking).toMatchObject({ status: 'creation-unknown', provider: 'fixture' });
    expect(checking.checkoutAttemptKey).toBe(checking.id);
    expect((await peer.query('SELECT count(*) FROM orders WHERE user_id=$1', [id])).rows[0].count).toBe('1');
    release.resolve({ reference: id, url: 'https://pay.example.invalid/checkout' });
    const ready = await first;
    expect(ready).toMatchObject({ id: checking.id, status: 'pending' });
    expect(await createOrders(peer).createOrder(id, quote.id, 'other', gateway(other, 'different'))).toEqual(ready);
    expect(await createOrders(peer).createOrder(id, quote.id, 'first', gateway(other))).toEqual(ready);
    expect(create).toHaveBeenCalledTimes(1);
    expect(other).not.toHaveBeenCalled();
  } finally {
    release.resolve({ reference: id, url: 'https://pay.example.invalid/checkout' });
    await first;
  }
});

test('terminal closure requires persisted provider evidence and keeps prior request keys bound', async () => {
  const { id, quote } = await buyer();
  const create = vi.fn(async () => ({ reference: randomUUID(), url: 'https://pay.example.invalid/checkout' }));
  const service = createOrders(database);
  const provider = gateway(create);
  const first = await service.createOrder(id, quote.id, 'first', provider);
  const freshQuote = await getOrCreateQuote(id, peer);
  await service.createOrder(id, freshQuote.id, 'alias', provider);
  const events = paymentEvents(peer);
  const closure = {
    id: 'closure', provider: first.provider, environment: first.environment, orderId: first.id, userId: id,
    providerReference: first.providerReference!, price: first.price, kind: 'cancelled' as const, providerTime: new Date(),
  };
  expect(await events.applyVerifiedEvent({ ...closure, providerReference: 'other' })).toBe('needs-review');
  expect(await service.createOrder(id, freshQuote.id, 'alias', provider)).toMatchObject({ status: 'pending' });
  expect(create).toHaveBeenCalledTimes(1);
  expect(await events.applyVerifiedEvent(closure)).toBe('applied');
  expect(await service.createOrder(id, freshQuote.id, 'alias', provider)).toMatchObject({
    id: first.id, status: 'cancelled', checkoutUrl: null,
  });
  const replacement = await service.createOrder(id, freshQuote.id, 'replacement', provider);
  expect(replacement.id).not.toBe(first.id);
  expect(create).toHaveBeenCalledTimes(2);
});

test.each(['before', 'after'])('unknown creation outcome %s remote creation remains reserved and scheduled', async phase => {
  const { id, quote } = await buyer();
  let remoteCreates = 0;
  const create = vi.fn(async () => {
    if (phase === 'after') remoteCreates++;
    throw new Error('connection lost');
  });
  const provider = gateway(create);
  const first = await createOrders(database).createOrder(id, quote.id, 'first', provider);
  expect(first.status).toBe('creation-unknown');
  expect(await createOrders(peer).createOrder(id, quote.id, 'retry', provider)).toEqual(first);
  expect(create).toHaveBeenCalledTimes(1);
  expect(remoteCreates).toBe(phase === 'after' ? 1 : 0);
  expect((await peer.query('SELECT recovery_due_at FROM orders WHERE id=$1', [first.id])).rows[0].recovery_due_at).toBeInstanceOf(Date);
});

test('a paid transition under the same account lock wins over a delayed checkout response', async () => {
  const { id, quote } = await buyer();
  const provider = gateway(async order => {
    await withPurchaseLock(peer, id, async client => {
      await client.query("UPDATE orders SET status='paid', provider_reference=$2 WHERE id=$1", [order.id, id]);
      await client.query('INSERT INTO entitlement_grants(id,user_id,order_id) VALUES ($1,$2,$3)', [randomUUID(), id, order.id]);
    });
    return { reference: id, url: 'https://pay.example.invalid/checkout' };
  });
  const paid = await createOrders(database).createOrder(id, quote.id, 'first', provider);
  expect(paid).toMatchObject({ status: 'paid', checkoutUrl: null });
  const freshQuote = await getOrCreateQuote(id, peer);
  await expect(createOrders(peer).createOrder(id, freshQuote.id, 'new', provider)).rejects.toMatchObject({ reason: 'lifetime-active' });
});
