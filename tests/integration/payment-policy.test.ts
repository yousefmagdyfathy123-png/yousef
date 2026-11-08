import { expect, test } from 'vitest';
import { paymentEvents } from '../../src/server/commerce/events';
import { fixtureDatabase, grant, purchase, settlement } from './payment-fixture';

const database = fixtureDatabase();

test('distinct refunds accumulate, invalid totals are quarantined, and paid cannot resurrect access', async () => {
  const { order, observation } = await purchase(database);
  const events = paymentEvents(database);
  const paid = settlement(observation);
  const refund = { id: order.id + '-r1', amount: { currency: 'USD' as const, minorUnits: 2500 } };
  expect(await events.applyVerifiedEvent({ ...paid, kind: 'refunded', refund })).toBe('applied');
  expect(await grant(database, order.id)).toBeUndefined();
  expect(await events.applyVerifiedEvent({ ...settlement(observation) })).toBe('applied');
  expect(await grant(database, order.id)).toBe('active');
  expect(await events.applyObservation({ ...observation, settlement: 'paid', refunds: [refund] }, 'authenticated-query')).toBe('applied');
  for (const [index, amount] of [
    { currency: 'USD', minorUnits: 8000 }, { currency: 'EGP', minorUnits: 100 }, { currency: 'USD', minorUnits: 0 },
  ].entries()) {
    expect(await events.applyVerifiedEvent({
      ...settlement(observation), kind: 'refunded',
      refund: { id: order.id + '-bad-' + index, amount: amount as typeof refund.amount },
    })).toBe('needs-review');
  }
  expect(await grant(database, order.id)).toBe('active');
  expect(await events.applyVerifiedEvent({
    ...settlement(observation), kind: 'refunded',
    refund: { id: order.id + '-r2', amount: { currency: 'USD', minorUnits: 7500 } },
  })).toBe('applied');
  await events.applyVerifiedEvent({ ...settlement(observation), kind: 'dispute-won', disputeId: order.id + '-d1' });
  await events.applyObservation({ ...observation, settlement: 'paid' }, 'authenticated-query');
  expect(await grant(database, order.id)).toBe('revoked');
  expect((await database.query('SELECT sum(minor_units) AS total FROM payment_refunds WHERE order_id=$1', [order.id])).rows[0].total).toBe('10000');
});

test('open, won and lost disputes preserve terminal precedence and independent grants', async () => {
  const { order, observation } = await purchase(database);
  const events = paymentEvents(database);
  const disputeId = order.id + '-dispute';
  await database.query('INSERT INTO entitlement_grants(id,user_id) VALUES ($1,$2)', [order.id + '-manual', order.userId]);
  await events.applyVerifiedEvent({ ...settlement(observation), kind: 'dispute-opened', disputeId });
  await events.applyVerifiedEvent(settlement(observation));
  expect(await grant(database, order.id)).toBe('suspended');
  await events.applyVerifiedEvent({ ...settlement(observation), kind: 'dispute-won', disputeId });
  await events.applyVerifiedEvent({ ...settlement(observation), kind: 'dispute-opened', disputeId });
  expect(await grant(database, order.id)).toBe('active');
  await events.applyVerifiedEvent({ ...settlement(observation), kind: 'dispute-opened', disputeId: disputeId + '-other' });
  await events.applyVerifiedEvent({ ...settlement(observation), kind: 'dispute-lost', disputeId: disputeId + '-other' });
  expect(await events.applyVerifiedEvent({
    ...settlement(observation), kind: 'dispute-won', disputeId: disputeId + '-other',
  })).toBe('needs-review');
  expect(await grant(database, order.id)).toBe('revoked');
  expect((await database.query('SELECT state FROM entitlement_grants WHERE id=$1', [order.id + '-manual'])).rows[0].state).toBe('active');
});
