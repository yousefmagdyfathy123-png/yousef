import { randomUUID } from 'node:crypto';
import { globSync, readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { createAdministration } from '../../src/server/admin/service';
import { expect, test, type Page } from '@playwright/test';
import { initialPassword, mailLink, signIn, signUp } from './auth-fixture';

const browserMutations = [
  'account/deletion', 'account/preferences', 'admin/closure', 'admin/deletion-review',
  'admin/suspension', 'admin/trial-recheck', 'checkout', 'checkout/quote',
  'orders/[id]/verify', 'workspace/enter', 'workspaces', 'workspaces/[id]/actions',
  'workspaces/[id]/operations/status', 'workspaces/[id]/resume', 'workspaces/[id]/search',
];
const distinctBoundaries = ['auth/[...all]', 'browser-token', 'payments/[provider]/webhook'];

test('every API mutation is assigned a browser or separate trust boundary', () => {
  const routes = globSync('src/app/api/**/route.ts').map(path => path.replaceAll('\\', '/'));
  const mutations = routes.filter(path => /\b(?:POST|PUT|PATCH|DELETE)\b/.test(readFileSync(path, 'utf8')))
    .map(path => path.slice('src/app/api/'.length, -'/route.ts'.length));
  expect(mutations.sort()).toEqual([...browserMutations, ...distinctBoundaries].sort());
});

function acquire(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch('/api/browser-token', { method: 'POST' });
    return {
      status: response.status,
      noStore: response.headers.get('cache-control') === 'no-store',
      token: response.ok ? (await response.json()).token as string : '',
    };
  });
}

test('only verified live sessions can acquire a token and reauthentication rotates it', async ({ page, context, baseURL }) => {
  const email = randomUUID() + '@example.invalid';
  await signUp(page, email);
  expect((await acquire(page)).status).toBe(403);
  await page.goto(await mailLink(email, 'verify-email'));
  await signIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  const session = (await context.cookies()).find(cookie => cookie.name === '__Secure-better-auth.session_token');
  expect(session && {
    secure: session.secure, httpOnly: session.httpOnly, sameSite: session.sameSite, domain: session.domain,
  }).toEqual({ secure: true, httpOnly: true, sameSite: 'Lax', domain: '127.0.0.1' });
  const first = await acquire(page);
  expect(first.status).toBe(200);
  expect(first.noStore).toBe(true);
  expect(first.token.length).toBe(43);
  const deniedHeaders: Record<string, string>[] = [
    { origin: baseURL! },
    { origin: 'https://sibling.example.invalid', 'x-alfadata-csrf': first.token },
  ];
  for (const headers of deniedHeaders) {
    const response = await context.request.post(baseURL + '/api/workspace/enter', { headers });
    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ reason: 'request-denied' });
    const checkout = await context.request.post(baseURL + '/api/checkout', {
      headers, data: { quoteId: randomUUID(), idempotencyKey: randomUUID() },
    });
    expect(checkout.status()).toBe(403);
    expect(await checkout.json()).toEqual({ reason: 'request-denied' });
  }
  const checkout = await context.request.post(baseURL + '/api/checkout', {
    headers: { origin: baseURL!, 'x-alfadata-csrf': first.token },
    data: { quoteId: randomUUID(), idempotencyKey: randomUUID() },
  });
  expect(checkout.status()).toBe(400);
  expect(await checkout.json()).toEqual({ reason: 'invalid-checkout' });
  const stale = await context.request.post(baseURL + '/api/checkout', {
    headers: { origin: baseURL!, 'x-alfadata-csrf': first.token },
    data: {
      quoteId: randomUUID(), idempotencyKey: randomUUID(),
      acknowledgement: { version: 'stale', hash: 'a'.repeat(64) },
    },
  });
  expect(stale.status()).toBe(409);
  expect(await stale.json()).toEqual({ reason: 'policy-changed' });
  await page.goto('/workspace');
  await expect(page.getByRole('button', { name: 'Start 120-hour trial' })).toBeVisible();
  await page.getByRole('button', { name: 'Start 120-hour trial' }).click();
  const trialEnd = page.getByText(/^Trial access ends at /);
  await expect(trialEnd).toBeVisible();
  const endMessage = await trialEnd.textContent();
  await page.getByRole('button', { name: 'Open new workspace' }).click();
  const workspace = page.locator('[data-workspace-id]');
  await expect(workspace).toBeVisible();
  const { id, binding } = await page.evaluate(() => JSON.parse(sessionStorage.getItem('alfadata/workspace/v1')!));
  const bindingHeaders = {
    'X-Workspace-Tab-Id': binding.tabId,
    'X-Workspace-Binding-Revision': String(binding.bindingRevision),
    'X-Recovery-Generation': binding.recoveryGeneration,
  };
  // Leave the workspace so its authorized recovery reads cannot renew activity during the snapshot.
  await page.goto('/account');
  const database = new Pool({ connectionString: process.env.ALFADATA_TEST_DATABASE_URL });
  try {
    const { rows: [user] } = await database.query<{ id: string }>('SELECT id FROM "user" WHERE email=$1', [email]);
    await createAdministration(database).grantAdmin(user.id);
    const snapshot = async () => {
      const tables = [
        'account_access', 'preferences', 'audit_events', 'quotes', 'orders', 'checkout_request_keys',
        'deletion_requests', 'service_closure', 'account_notice_outbox', 'workspaces',
        'workspace_operation_receipts', 'provider_events', 'entitlement_grants', 'session',
      ];
      return Object.fromEntries(await Promise.all(tables.map(async table => [
        table, (await database.query(`SELECT md5(to_jsonb(t)::text) AS digest FROM ${table} t ORDER BY 1`)).rows,
      ])));
    };
    const before = await snapshot();
    for (const endpoint of browserMutations) {
      const path = '/api/' + endpoint.replace('[id]', endpoint.startsWith('orders/') ? randomUUID() : id);
      const trialRecheck = endpoint === 'admin/trial-recheck';
      const data = trialRecheck ? { userId: user.id } : endpoint.startsWith('orders/') ? undefined : {};
      for (const headers of [
        ...deniedHeaders,
        { origin: baseURL!, 'x-alfadata-csrf': 'A'.repeat(43) },
        { referer: 'https://sibling.example.invalid/account', 'x-alfadata-csrf': first.token },
      ]) {
        const response = await context.request.post(path, { headers: { ...bindingHeaders, ...headers }, data });
        expect(response.status(), path).toBe(403);
        expect(Object.values(await response.json()), path).toContain(trialRecheck ? 'Trial recheck denied.' : 'request-denied');
      }
    }
    const webhook = await context.request.post('/api/payments/unknown/webhook', {
      headers: { origin: baseURL!, 'x-alfadata-csrf': first.token }, data: {},
    });
    expect(webhook.status()).toBe(404);
    const signInFromForeignOrigin = await context.request.post('/api/auth/sign-in/email', {
      headers: { origin: 'https://sibling.example.invalid' },
      data: { email, password: initialPassword },
    });
    expect(signInFromForeignOrigin.status()).toBe(403);
    expect(await snapshot()).toEqual(before);
  } finally {
    await database.end();
  }
  const info = await context.request.get(`/api/workspaces/${id}/resume-info`);
  expect(await info.json()).toEqual({ bindingRevision: 0 });
  const tab = await context.newPage();
  await tab.goto('/account');
  expect((await acquire(tab)).token === first.token).toBe(true);
  for (const source of ['null', 'https://sibling.example.invalid']) {
    const response = await context.request.post(baseURL + '/api/browser-token', { headers: { origin: source } });
    expect(response.status()).toBe(403);
  }
  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  expect((await acquire(tab)).status).toBe(403);
  await signIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  expect((await acquire(page)).token !== first.token).toBe(true);
  await page.goto('/workspace');
  await expect(trialEnd).toHaveText(endMessage!);
});
