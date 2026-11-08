import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { Pool } from 'pg';
import { createOrders } from '../../src/server/commerce/orders';
import { getOrCreateQuote } from '../../src/server/commerce/pricing';
import { createTestProvider } from '../../src/server/commerce/providers/test';
import { createReconciliation } from '../../src/server/commerce/reconciliation';
import { mailLink, signIn, signUp } from './auth-fixture';

test('the account shows persisted checkout state and a scheduled check recovers a missed payment', async ({ page, context, baseURL }) => {
  const email = randomUUID() + '@example.invalid';
  const url = process.env.ALFADATA_TEST_DATABASE_URL;
  if (!url || !/^\/alfadata_test_[a-f0-9]{32}$/.test(new URL(url).pathname)) throw new Error('Use the auth browser test runner');
  const db = new Pool({ connectionString: url });
  try {
    await signUp(page, email);
    await page.goto(await mailLink(email, 'verify-email'));
    await signIn(page, email);
    await expect(page).toHaveURL(/\/account$/);
    const { rows: [user] } = await db.query<{ id: string }>('SELECT id FROM "user" WHERE email=$1', [email]);
    const fixture = createTestProvider(randomUUID(), { loseCreateResponse: true });
    const quote = await getOrCreateQuote(user.id, db);
    const order = await createOrders(db).createOrder(user.id, quote.id, randomUUID(), fixture.provider);
    const path = baseURL + '/api/orders/' + order.id + '/verify';
    const denied = await context.request.post(path, { headers: { origin: baseURL! } });
    expect(denied.status()).toBe(403);

    await page.reload();
    const payments = page.getByRole('region', { name: 'Payments' });
    await expect(payments).toContainText('Checking checkout');
    await expect(payments).toContainText('Test payment');
    const verification = page.waitForResponse(response => response.url() === path && response.request().method() === 'POST');
    await payments.getByRole('button', { name: 'Check payment status' }).click();
    const checked = await verification;
    expect(checked.status()).toBe(200);
    expect(await checked.json()).toMatchObject({ kind: 'checking', status: 'creation-unknown' });
    await expect(payments.getByRole('status')).toHaveText('Payment is still being checked.');

    fixture.publish({ ...fixture.observation(order.id), settlement: 'paid' });
    await db.query('UPDATE orders SET recovery_due_at=now() WHERE id=$1', [order.id]);
    const worker = createReconciliation(db, id => id === fixture.provider.id ? fixture.provider : undefined);
    expect(await worker.reconcileOrder(order.id, 'scheduled')).toMatchObject({ kind: 'checked', status: 'paid' });
    await page.reload();
    await expect(payments).toContainText('Access active');
    await expect(page.getByText(/Lifetime access is active/)).toBeVisible();
    fixture.publish({
      ...fixture.observation(order.id), settlement: 'paid',
      refunds: [{ id: randomUUID(), amount: order.price }],
    });
    await db.query('UPDATE orders SET recovery_due_at=now() WHERE id=$1', [order.id]);
    expect(await worker.reconcileOrder(order.id, 'scheduled')).toMatchObject({ kind: 'checked' });
    await page.reload();
    await expect(payments).toContainText('Fully refunded');
    await expect(page.getByText(/Lifetime access is active/)).toHaveCount(0);
    expect(fixture.creates).toBe(1);
  } finally {
    await db.end();
  }
});
