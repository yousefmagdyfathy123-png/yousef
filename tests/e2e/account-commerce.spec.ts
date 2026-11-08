import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { Pool } from 'pg';
import { createAdministration } from '../../src/server/admin/service';
import { initialPassword, mailLink, signIn, signUp } from './auth-fixture';

test('pricing, admin suspension and protected owner deletion request', async ({ page, browser, baseURL }) => {
  const database = new Pool({ connectionString: process.env.ALFADATA_TEST_DATABASE_URL });
  const email = randomUUID() + '@example.invalid';
  const operatorEmail = randomUUID() + '@example.invalid';
  const operator = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  try {
    await signUp(page, email);
    await page.goto(await mailLink(email, 'verify-email'));
    await signIn(page, email);
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByText(/120-hour trial starts/)).toBeVisible();
    const { rows: [user] } = await database.query<{ id: string }>(
      'UPDATE "user" SET registration_country_code=$2,registration_country_source=$3 WHERE email=$1 RETURNING id',
      [email, 'EG', 'trusted-edge'],
    );
    await page.goto('/pricing');
    for (const price of ['EGP 1,000', 'SAR 500', 'USD 100']) await expect(page.getByText(price, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/EGP payment method is currently unavailable/)).toBeVisible();
    await expect(page.getByText(/no recurring renewal/)).toBeVisible();
    await expect(page.getByText(/All purchases are final/)).toBeVisible();
    const support = page.getByRole('link', { name: /WhatsApp/ });
    await expect(support).toHaveAttribute('href', 'https://wa.me/966563447314');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(support).toHaveAttribute('href', 'https://wa.me/966563447314');
    await page.getByRole('link', { name: 'Read the purchase policy' }).click();
    await expect(page.getByText(/Synthetic browser-test purchase policy/)).toBeVisible();
    expect((await page.goto('/admin'))?.status()).toBe(404);

    await page.goto('/account');
    await page.getByText('Request account deletion', { exact: true }).click();
    await page.getByLabel('Confirm your password').fill('Incorrect password');
    await page.getByRole('button', { name: 'Submit deletion request' }).click();
    await expect(page.locator('details').getByRole('status')).toHaveText('Password confirmation failed.');
    await page.getByLabel('Confirm your password').fill(initialPassword);
    await page.getByRole('button', { name: 'Submit deletion request' }).click();
    await expect(page.locator('details').getByRole('status')).toContainText('Your request is pending review.');
    expect((await database.query('SELECT 1 FROM account_access WHERE user_id=$1', [user.id])).rowCount).toBe(0);

    const adminPage = await operator.newPage();
    await signUp(adminPage, operatorEmail);
    await adminPage.goto(await mailLink(operatorEmail, 'verify-email'));
    await signIn(adminPage, operatorEmail);
    await expect(adminPage).toHaveURL(/\/account$/);
    const admin = (await database.query<{ id: string }>('SELECT id FROM "user" WHERE email=$1', [operatorEmail])).rows[0];
    await createAdministration(database).grantAdmin(admin.id);
    await adminPage.goto('/admin');
    const target = adminPage.getByRole('listitem').filter({ hasText: email });
    const denied = await adminPage.evaluate(async userId => (await fetch('/api/admin/suspension', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, suspended: true }),
    })).status, user.id);
    expect(denied).toBe(403);
    await adminPage.getByRole('button', { name: 'Record review' }).click();
    await expect(adminPage.getByText(/· Reviewed/)).toBeVisible();
    await target.getByRole('button', { name: 'Suspend account' }).click();
    await expect(target.getByRole('button', { name: 'Restore account' })).toBeVisible();
    const prefs = await page.request.get('/api/account/preferences');
    expect(prefs.status()).toBe(403);
    await page.reload();
    await expect(page.getByText('Your account is suspended.')).toBeVisible();
  } finally {
    await operator.close();
    await database.end();
  }
});
