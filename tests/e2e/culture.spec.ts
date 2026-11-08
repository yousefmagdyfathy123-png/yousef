import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { Pool } from 'pg';
import { mailLink, signIn, signUp } from './auth-fixture';

test('browser locale cannot change protected search order or override workspace culture', async ({ page, browser, baseURL }) => {
  const email = randomUUID() + '@example.invalid';
  await signUp(page, email);
  await page.goto(await mailLink(email, 'verify-email'));
  await signIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  await page.goto('/workspace');
  await page.getByRole('button', { name: 'Start 120-hour trial' }).click();
  await page.getByRole('button', { name: 'Open new workspace' }).click();
  await expect(page.locator('[data-workspace-id]')).toBeVisible();
  const workspace = await page.evaluate(() => JSON.parse(sessionStorage.getItem('alfadata/workspace/v1')!));
  const state = await page.context().storageState();
  const results: unknown[] = [];
  const database = new Pool({ connectionString: process.env.ALFADATA_TEST_DATABASE_URL });
  await using cleanup = { [Symbol.asyncDispose]: () => database.end() };
  for (const [locale, country, currency] of [
    ['en-US', 'US', 'USD'], ['ar-EG', 'EG', 'EGP'], ['de-DE', 'SA', 'SAR'],
  ]) {
    await database.query(`UPDATE "user" SET registration_country_code=$2,
      registration_country_source='trusted-edge' WHERE email=$1`, [email, country]);
    await database.query(`UPDATE quotes SET status='consumed' WHERE user_id=(SELECT id FROM "user" WHERE email=$1)`, [email]);
    const context = await browser.newContext({ baseURL, locale, storageState: state, ignoreHTTPSErrors: true });
    try {
      const tab = await context.newPage();
      await tab.goto('/account');
      expect(await tab.evaluate(() => navigator.language)).toBe(locale);
      const result = await tab.evaluate(async ({ id, binding, locale }) => {
        const token = await (await fetch('/api/browser-token', { method: 'POST' })).json();
        const headers = {
          'Content-Type': 'application/json',
          'X-Alfadata-CSRF': token.token,
          'X-Workspace-Tab-Id': binding.tabId,
          'X-Workspace-Binding-Revision': String(binding.bindingRevision),
          'X-Recovery-Generation': binding.recoveryGeneration,
          'Accept-Language': locale,
        };
        const path = '/api/workspaces/' + id;
        const current = await fetch(path, { headers });
        const { revision } = await current.json();
        const operationSequence = Number(current.headers.get('X-Workspace-Operation-Sequence')) + 1;
        const search = await fetch(path + '/search', { method: 'POST', headers, body: JSON.stringify({ query: 'elbow' }) });
        const override = await fetch(path + '/actions', { method: 'POST', headers, body: JSON.stringify({
          operationId: crypto.randomUUID(), operationSequence, expectedRevision: revision, action: { type: 'back', culture: locale },
        }) });
        const action = await fetch(path + '/actions', { method: 'POST', headers, body: JSON.stringify({
          operationId: crypto.randomUUID(), operationSequence, expectedRevision: revision, action: { type: 'back' },
        }) });
        const quote = await fetch('/api/checkout/quote', { method: 'POST', headers });
        return {
          status: search.status, hits: (await search.json()).hits, override: override.status,
          actionStatus: action.status, view: (await action.json()).view, currency: (await quote.json()).price?.currency,
        };
      }, { ...workspace, locale });
      expect(result).toMatchObject({ status: 200, override: 400, actionStatus: 200, currency });
      expect(result.hits[0]).toEqual({ id: 'Ftbw1', text: 'Buttwelded 45deg Elbow' });
      results.push({ hits: result.hits, view: result.view });
    } finally {
      await context.close();
    }
  }
  expect(results).toEqual([results[0], results[0], results[0]]);
});
