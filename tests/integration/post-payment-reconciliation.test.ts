import { expect, test, vi } from 'vitest';
import { paymentEvents } from '../../src/server/commerce/events';
import { createPaymentHistory } from '../../src/server/commerce/payment-history';
import { PaymentHistoryGap } from '../../src/server/commerce/payment-types';
import { createReconciliation, resumePaymentReview } from '../../src/server/commerce/reconciliation';
import { fixtureDatabase, grant, purchase, settlement } from './payment-fixture';

const database = fixtureDatabase();

test('recurring paid review discovers omitted dispute and refund webhooks without erasing earlier facts', async () => {
  const { fixture, order, observation } = await purchase(database);
  await database.query("INSERT INTO account_access(user_id,trial_started_at,trial_ends_at) VALUES ($1,'2026-11-01T10:00Z','2026-11-06T10:00Z')", [order.userId]);
  await database.query('INSERT INTO entitlement_grants(id,user_id) VALUES ($1,$2)', [order.id + '-other', order.userId]);
  await paymentEvents(database).applyVerifiedEvent(settlement(observation));
  const worker = createReconciliation(database, id => id === fixture.provider.id ? fixture.provider : undefined, { batchSize: 1 });
  const forceDue = () => database.query("UPDATE orders SET recovery_due_at='2000-01-01' WHERE id=$1", [order.id]);
  const check = async () => {
    await forceDue();
    expect((await worker.reconcileDueOrders()).results[0]).toMatchObject({ kind: 'checked', status: 'paid' });
  };
  const paid = { ...observation, settlement: 'paid' as const };
  const dispute = { id: order.id + '-d', status: 'open' as const };
  fixture.publish({ ...paid, disputes: [dispute] });
  await check();
  expect(await grant(database, order.id)).toBe('suspended');
  fixture.publish({ ...paid, disputes: [{ ...dispute, status: 'won' }] });
  await check();
  expect(await grant(database, order.id)).toBe('active');
  fixture.publish({ ...paid, refunds: [
    { id: order.id + '-r1', amount: { currency: 'USD', minorUnits: 2500 } },
    { id: order.id + '-r2', amount: { currency: 'USD', minorUnits: 7500 } },
  ] });
  await check();
  fixture.publish(paid);
  await check();
  expect(await grant(database, order.id)).toBe('revoked');
  expect((await database.query('SELECT state FROM entitlement_grants WHERE id=$1', [order.id + '-other'])).rows[0].state).toBe('active');
  expect((await database.query('SELECT trial_ends_at FROM account_access WHERE user_id=$1', [order.userId])).rows[0].trial_ends_at)
    .toEqual(new Date('2026-11-06T10:00Z'));
});

test('paid timeout preserves access and freshness, pauses at the retry limit, and resumes explicitly', async () => {
  const { fixture, order, observation } = await purchase(database);
  await paymentEvents(database).applyVerifiedEvent(settlement(observation));
  const worker = createReconciliation(database, () => fixture.provider, { maxFailures: 1, timeoutMs: 15 });
  const lookup = vi.spyOn(fixture.provider.recovery!, 'lookupOrder').mockImplementationOnce(async () => {
    await new Promise(resolve => setTimeout(resolve, 40));
    return { kind: 'unknown' };
  });
  expect(await worker.reconcileOrder(order.id, 'scheduled')).toMatchObject({ kind: 'needs-review', status: 'paid' });
  expect(await grant(database, order.id)).toBe('active');
  expect((await database.query('SELECT last_verified_at FROM orders WHERE id=$1', [order.id])).rows[0].last_verified_at).toBeNull();
  await database.query("INSERT INTO user_roles(user_id,role) VALUES ($1,'admin')", [order.userId]);
  expect(await resumePaymentReview(database, order.id, order.userId)).toBe(true);
  fixture.publish({ ...observation, settlement: 'paid' });
  expect(await worker.reconcileOrder(order.id, 'scheduled')).toMatchObject({ kind: 'checked', status: 'paid' });
  expect(lookup).toHaveBeenCalledTimes(2);
});

test('history overlaps deduplicate, quarantine unmatched records, and retain coverage gaps', async () => {
  const { fixture, order, observation } = await purchase(database);
  const sync = createPaymentHistory(database);
  expect(await sync(fixture.provider)).toMatchObject({ kind: 'unsupported' });
  const paid = { id: order.id + '-history', observation: { ...observation, settlement: 'paid' as const } };
  const readPage = vi.fn(async (cursor: string | null) => {
    if (!cursor) return { records: [paid], nextCursor: 'page-1', hasMore: true };
    if (cursor === 'page-1') return {
      records: [paid, { id: 'unmatched-' + order.id, observation: { ...observation, orderId: 'missing' } }],
      nextCursor: 'page-2', hasMore: false,
    };
    throw new PaymentHistoryGap();
  });
  fixture.provider.recovery!.history = { readPage };
  await database.query(`
    CREATE FUNCTION fixture_fail_cursor() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'fixture cursor commit failure'; END; $$;
    CREATE TRIGGER fixture_fail_cursor BEFORE UPDATE ON payment_history_cursors
      FOR EACH ROW EXECUTE FUNCTION fixture_fail_cursor()
  `);
  try {
    await expect(sync(fixture.provider)).rejects.toThrow('fixture cursor commit failure');
    expect(await grant(database, order.id)).toBe('active');
    expect((await database.query("SELECT cursor FROM payment_history_cursors WHERE provider='test'")).rows[0].cursor).toBeNull();
  } finally {
    await database.query('DROP TRIGGER fixture_fail_cursor ON payment_history_cursors; DROP FUNCTION fixture_fail_cursor()');
  }
  expect(await sync(fixture.provider)).toEqual({ kind: 'synced', processed: 1 });
  expect(await grant(database, order.id)).toBe('active');
  expect(await sync(fixture.provider)).toMatchObject({ kind: 'incomplete' });
  expect((await database.query("SELECT cursor,incomplete FROM payment_history_cursors WHERE provider='test'")).rows[0])
    .toEqual({ cursor: 'page-2', incomplete: true });
  expect((await database.query("SELECT result FROM payment_history_records WHERE id=$1", ['unmatched-' + order.id])).rows[0].result)
    .toBe('quarantined');
  expect((await database.query("SELECT count(*) FROM audit_events WHERE action='authenticated-history' AND subject_user_id=$1", [order.userId])).rows[0].count)
    .toBe('1');
});

test('due workers prioritize old paid orders and skip a concurrent active lease', async () => {
  const old = await purchase(database);
  const recent = await purchase(database);
  await paymentEvents(database).applyVerifiedEvent(settlement(old.observation));
  old.fixture.publish({ ...old.observation, settlement: 'paid' });
  await database.query("UPDATE orders SET recovery_due_at='2000-01-01' WHERE id=$1", [old.order.id]);
  await database.query("UPDATE orders SET recovery_due_at='2000-01-02' WHERE id=$1", [recent.order.id]);
  const started = Promise.withResolvers<void>();
  const finish = Promise.withResolvers<void>();
  const original = old.fixture.provider.recovery!.lookupOrder;
  const lookup = vi.fn<typeof original>(async (order, signal) => {
    if (order.id === old.order.id) {
      started.resolve();
      await finish.promise;
      return original(order, signal);
    }
    return recent.fixture.provider.recovery!.lookupOrder(order, signal);
  });
  old.fixture.provider.recovery!.lookupOrder = lookup;
  const worker = createReconciliation(database, () => old.fixture.provider, { batchSize: 1 });
  const first = worker.reconcileDueOrders();
  await started.promise;
  try {
    expect(await worker.reconcileDueOrders()).toMatchObject({ claimed: 1, results: [{ status: 'pending' }] });
  } finally {
    finish.resolve();
    await first;
  }
  expect((await first).results[0]).toMatchObject({ kind: 'checked', status: 'paid' });
  expect(lookup.mock.calls.map(([order]) => order.id)).toEqual([old.order.id, recent.order.id]);
});
