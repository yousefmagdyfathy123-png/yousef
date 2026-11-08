import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { Pool } from 'pg';
import { mailLink, signIn, signUp } from './auth-fixture';

test('reload recovers the workspace, cloned tabs stay isolated, and guests and expired workspaces are denied', async ({ page, browser, baseURL }) => {
  const email = randomUUID() + '@example.invalid';
  await signUp(page, email);
  await page.goto(await mailLink(email, 'verify-email'));
  await signIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  await page.goto('/workspace');
  await page.getByRole('button', { name: 'Start 120-hour trial' }).click();
  const open = page.getByRole('button', { name: 'Open new workspace' });
  await open.click();
  const workspace = page.locator('[data-workspace-id]');
  await expect(workspace).toBeVisible();
  const id = (await workspace.getAttribute('data-workspace-id'))!;
  const results = workspace.getByRole('table');
  const initial = await results.textContent();

  const asset = await page.evaluate(async () => {
    const { id, binding } = JSON.parse(sessionStorage.getItem('alfadata/workspace/v1')!);
    const response = await fetch('/api/workspaces/' + id + '/assets/drawing', { headers: {
      'X-Workspace-Tab-Id': binding.tabId, 'X-Workspace-Binding-Revision': String(binding.bindingRevision),
      'X-Recovery-Generation': binding.recoveryGeneration,
    } });
    const drawing = await response.json();
    return { status: response.status, cache: response.headers.get('cache-control'), commands: drawing.commands?.length };
  });
  expect(asset).toMatchObject({ status: 200, cache: 'private, no-store' });
  expect(asset.commands).toBeGreaterThan(0);

  const binding = await page.evaluate(() => JSON.parse(sessionStorage.getItem('alfadata/workspace/v1')!).binding);
  const guest = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  try {
    const headers = {
      'X-Workspace-Tab-Id': binding.tabId,
      'X-Workspace-Binding-Revision': String(binding.bindingRevision),
      'X-Recovery-Generation': binding.recoveryGeneration,
    };
    const root = '/api/workspaces/' + id;
    for (const endpoint of ['', '/assets/drawing', '/resume-info']) {
      const response = await guest.request.get(root + endpoint, { headers });
      expect(response.status()).toBe(401);
      expect(response.headers()['cache-control']).toBe('private, no-store');
    }
    for (const endpoint of ['/resume', '/actions', '/operations/status', '/search']) {
      const response = await guest.request.post(root + endpoint, { headers, data: {} });
      expect(response.status()).toBe(401);
      expect(response.headers()['cache-control']).toBe('private, no-store');
    }
  } finally {
    await guest.close();
  }

  await page.reload();
  await expect(workspace).toHaveAttribute('data-workspace-id', id);
  expect(await results.textContent()).toBe(initial);
  const popupPromise = page.waitForEvent('popup');
  const copiedStorage = await page.evaluate(() => {
    const clone = window.open('/workspace');
    return clone?.sessionStorage.getItem('alfadata/workspace/v1') ?? null;
  });
  expect(JSON.parse(copiedStorage!).id).toBe(id);
  const popup = await popupPromise;
  await popup.getByRole('button', { name: 'Open new workspace' }).click();
  const copy = popup.locator('[data-workspace-id]');
  await expect(copy).toBeVisible();
  await expect(copy).not.toHaveAttribute('data-workspace-id', id);

  const database = new Pool({ connectionString: process.env.ALFADATA_TEST_DATABASE_URL });
  try {
    await database.query('UPDATE workspaces SET expires_at=clock_timestamp() WHERE id=$1', [id]);
  } finally {
    await database.end();
  }
  const denied = await page.evaluate(async () => {
    const { id, binding } = JSON.parse(sessionStorage.getItem('alfadata/workspace/v1')!);
    const token = await (await fetch('/api/browser-token', { method: 'POST' })).json();
    const headers = {
      'Content-Type': 'application/json',
      'X-Alfadata-CSRF': token.token,
      'X-Workspace-Tab-Id': binding.tabId,
      'X-Workspace-Binding-Revision': String(binding.bindingRevision),
      'X-Recovery-Generation': binding.recoveryGeneration,
    };
    const base = '/api/workspaces/' + id;
    const operation = { operationId: crypto.randomUUID(), operationSequence: 1, expectedRevision: 1, action: { type: 'back' } };
    const get = (path: string) => fetch(base + path, { headers, cache: 'no-store' });
    const post = (path: string, body: object) => fetch(base + path, { method: 'POST', headers, body: JSON.stringify(body) });
    const responses = await Promise.all([
      get(''), get('/assets/drawing'), get('/resume-info'),
      post('/resume', { resumeRequestId: crypto.randomUUID(), expectedBindingRevision: binding.bindingRevision, tabId: binding.tabId }),
      post('/actions', operation), post('/operations/status', operation), post('/search', { query: 'elbow' }),
    ]);
    return responses.map(response => [response.status, response.headers.get('cache-control')]);
  });
  expect(denied).toEqual(Array.from({ length: 7 }, () => [410, 'private, no-store']));
  await page.reload();
  await expect(page.getByText('This workspace has expired. Open a new workspace to continue.')).toBeVisible();
  await expect(workspace).toHaveCount(0);
  await open.click();
  await expect(workspace).toBeVisible();
  await expect(workspace).not.toHaveAttribute('data-workspace-id', id);
});
