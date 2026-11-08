import { randomUUID } from 'node:crypto';
import { expect, test, vi } from 'vitest';
import { paymentEvents } from '../../src/server/commerce/events';
import { claimProviderRequest, createReconciliation, resumePaymentReview } from '../../src/server/commerce/reconciliation';
import { createTestProvider } from '../../src/server/commerce/providers/test';
import { verifyPaymentHandler } from '../../src/server/commerce/verify-handler';
import { createBrowserProtection } from '../../src/server/security/browser-mutation';
import { fixtureDatabase, grant, purchase, secret, settlement } from './payment-fixture';

const database = fixtureDatabase();

test('workers share a provider request quota and recover when the window expires', async () => {
  const { provider } = createTestProvider(secret);
  provider.id = randomUUID();
  const permits = await Promise.all(Array.from({ length: 4 }, () => claimProviderRequest(database, provider, 2)));
  expect(permits.filter(Boolean)).toHaveLength(2);
  await database.query("UPDATE payment_provider_quota SET window_start='2000-01-01' WHERE provider=$1", [provider.id]);
  expect(await claimProviderRequest(database, provider, 2)).toBe(true);
});

test('lost create response and missed webhook recover by stable reference without creating another checkout', async () => {
  const { fixture, order, observation } = await purchase(database, true);
  expect(order.status).toBe('creation-unknown');
  const worker = createReconciliation(database, () => fixture.provider);
  expect(await worker.reconcileOrder(order.id, 'manual', 'other')).toEqual({ kind: 'not-found' });
  expect(await worker.reconcileOrder(order.id, 'manual', order.userId)).toMatchObject({
    kind: 'checked', status: 'pending', checkoutUrl: observation.checkoutUrl,
  });
  expect(await worker.reconcileOrder(order.id, 'manual', order.userId)).toEqual({ kind: 'rate-limited' });
  expect(fixture.creates).toBe(1);
  expect(await grant(database, order.id)).toBeUndefined();
  fixture.publish({ ...observation, settlement: 'paid' });
  await database.query('UPDATE orders SET recovery_due_at=now(),last_manual_check_at=NULL WHERE id=$1', [order.id]);
  await Promise.all([
    worker.reconcileDueOrders(),
    worker.reconcileOrder(order.id, 'manual', order.userId),
    paymentEvents(database).applyVerifiedEvent(settlement(observation)),
  ]);
  expect(await grant(database, order.id)).toBe('active');
  expect((await database.query('SELECT count(*) FROM entitlement_grants WHERE order_id=$1', [order.id])).rows[0].count).toBe('1');
  expect(fixture.creates).toBe(1);
});

test('unknown outcome stays unresolved, exhausted work is visible and only an audited admin can resume it', async () => {
  const { fixture, order, observation } = await purchase(database, true);
  const lookup = vi.fn(fixture.provider.recovery!.lookupOrder);
  fixture.provider.recovery!.lookupOrder = lookup;
  lookup.mockResolvedValueOnce({ kind: 'not-found' });
  lookup.mockImplementationOnce(async (_order, signal) => new Promise((_, reject) =>
    signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true }),
  ));
  const worker = createReconciliation(database, () => fixture.provider, { maxFailures: 2, timeoutMs: 20 });
  await database.query("UPDATE orders SET recovery_due_at=now(),recovery_lease='dead',recovery_lease_until=now()-interval '1 second' WHERE id=$1", [order.id]);
  expect(await worker.reconcileOrder(order.id, 'scheduled')).toMatchObject({ kind: 'checking', status: 'creation-unknown' });
  await database.query('UPDATE orders SET recovery_due_at=now() WHERE id=$1', [order.id]);
  expect(await worker.reconcileOrder(order.id, 'scheduled')).toMatchObject({ kind: 'needs-review', status: 'creation-unknown' });
  expect(await worker.reconcileOrder(order.id, 'scheduled')).toEqual({ kind: 'busy' });
  expect(await grant(database, order.id)).toBeUndefined();
  expect(await resumePaymentReview(database, order.id, order.userId)).toBe(false);
  await database.query("INSERT INTO user_roles(user_id,role) VALUES ($1,'admin')", [order.userId]);
  expect(await resumePaymentReview(database, order.id, order.userId)).toBe(true);
  fixture.publish({ ...observation, settlement: 'paid' });
  expect(await worker.reconcileOrder(order.id, 'scheduled')).toMatchObject({ kind: 'checked', status: 'paid' });
  expect((await database.query("SELECT 1 FROM audit_events WHERE actor_user_id=$1 AND action='payment-review-resumed'", [order.userId])).rowCount).toBe(1);
});

test('manual verification checks session token, origin, body and ownership before lookup', async () => {
  const { fixture, order } = await purchase(database);
  const lookup = vi.fn(fixture.provider.recovery!.lookupOrder);
  fixture.provider.recovery!.lookupOrder = lookup;
  const worker = createReconciliation(database, () => fixture.provider);
  const origin = 'https://app.example.invalid';
  const principal = { userId: order.userId, sessionId: 'one', role: 'user' as const, emailVerified: true, suspended: false };
  const readPrincipal = async (request: Request) => request.headers.get('cookie') ? {
    ...principal, userId: request.headers.get('cookie') === 'other' ? 'other' : order.userId,
    sessionId: request.headers.get('cookie')!,
  } : null;
  const protect = createBrowserProtection({ origin, secret, readPrincipal });
  const handle = verifyPaymentHandler(worker.reconcileOrder, { readPrincipal, protect: protect.require });
  const request = (headers: Record<string, string>, body?: string | Uint8Array<ArrayBuffer>) =>
    new Request(origin, { method: 'POST', headers, body });
  const token = await protect.issue(request({ origin, cookie: 'owner' }));
  const other = await protect.issue(request({ origin, cookie: 'other' }));
  const valid = { origin, cookie: 'owner', 'x-alfadata-csrf': token };
  expect((await handle(request({ origin }), order.id)).status).toBe(401);
  expect((await handle(request({ origin, cookie: 'owner' }), order.id)).status).toBe(403);
  expect((await handle(request({ ...valid, origin: 'https://evil.invalid' }), order.id)).status).toBe(403);
  expect((await handle(request({ ...valid, cookie: 'other', 'x-alfadata-csrf': other }), order.id)).status).toBe(404);
  expect((await handle(request(valid, '{"status":"paid"}'), order.id)).status).toBe(400);
  expect(lookup).not.toHaveBeenCalled();
  expect((await handle(request(valid, new Uint8Array(0)), order.id)).status).toBe(200);
  expect(lookup).toHaveBeenCalledTimes(1);
});
