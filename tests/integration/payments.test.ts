import { expect, test } from 'vitest';
import { paymentEvents } from '../../src/server/commerce/events';
import { signTestWebhook } from '../../src/server/commerce/providers/test';
import { webhookHandler } from '../../src/server/commerce/webhook-handler';
import { fixtureDatabase, grant, purchase, secret, settlement } from './payment-fixture';

const database = fixtureDatabase();

test('only matching signed provider events grant access and delivery is idempotent', async () => {
  const { fixture, order, observation } = await purchase(database);
  const events = paymentEvents(database);
  const handle = webhookHandler(id => id === fixture.provider.id ? fixture.provider : undefined, events.applyVerifiedEvent);
  const paid = settlement(observation);
  const request = (event: object, signed = true) => {
    const body = Buffer.from(JSON.stringify(event));
    return new Request('https://app.example.invalid/webhook', {
      method: 'POST', body, headers: { 'x-alfadata-test-signature': signed ? signTestWebhook(body, secret) : '0'.repeat(64) },
    });
  };
  expect(order.status).toBe('pending');
  expect(await grant(database, order.id)).toBeUndefined();
  expect((await handle(request(paid, false), 'test')).status).toBe(401);
  for (const change of [
    { price: { currency: 'USD', minorUnits: 9999 } }, { price: { currency: 'EGP', minorUnits: 10000 } },
    { userId: 'other' }, { orderId: 'other' }, { providerReference: 'other' },
  ]) expect((await handle(request({ ...paid, ...change }), 'test')).status).toBe(204);
  expect((await handle(request({ ...paid, environment: 'live' }), 'test')).status).toBe(401);
  expect((await handle(request({ ...paid, provider: 'other' }), 'test')).status).toBe(401);
  expect(await grant(database, order.id)).toBeUndefined();
  expect((await database.query(
    'SELECT provider_reference FROM payment_reference_conflicts WHERE order_id=$1', [order.id],
  )).rows).toEqual([{ provider_reference: 'other' }]);

  const failed = { ...settlement(observation, 'failed'), providerTime: new Date(+paid.providerTime - 1000) };
  expect(await events.applyVerifiedEvent(settlement(observation, 'pending'))).toBe('applied');
  expect(await grant(database, order.id)).toBeUndefined();
  const results = await Promise.all([handle(request(paid), 'test'), handle(request(paid), 'test')]);
  expect(results.map(result => result.status)).toEqual([204, 204]);
  expect(await events.applyVerifiedEvent(failed)).toBe('applied');
  expect(await grant(database, order.id)).toBe('active');
  expect((await database.query('SELECT count(*) FROM provider_events WHERE id=$1', [paid.id])).rows[0].count).toBe('1');
  expect((await database.query('SELECT status FROM orders WHERE id=$1', [order.id])).rows[0].status).toBe('paid');
});
