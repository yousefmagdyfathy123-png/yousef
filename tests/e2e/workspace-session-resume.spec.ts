import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { mailLink, signIn, signUp } from './auth-fixture';

test('a new login can explicitly resume the same workspace and its confirmed revision', async ({ page }) => {
  const email = randomUUID() + '@example.invalid';
  await signUp(page, email);
  await page.goto(await mailLink(email, 'verify-email'));
  await signIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  await page.goto('/workspace');
  await page.getByRole('button', { name: 'Start 120-hour trial' }).click();
  await page.getByRole('button', { name: 'Open new workspace' }).click();
  const units = page.getByRole('combobox', { name: 'Units', exact: true });
  await units.selectOption('Imperial');
  await expect(units).toHaveValue('Imperial');
  const id = await page.locator('[data-workspace-id]').getAttribute('data-workspace-id');
  const drawing = page.getByRole('region', { name: 'Engineering workspace' });
  const revision = await drawing.getAttribute('data-revision');
  const former = await page.evaluate(() => JSON.parse(sessionStorage.getItem('alfadata/workspace/v1')!).binding);
  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await signIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  await page.goto('/workspace');
  await expect(drawing).toHaveCount(0);
  await page.getByRole('button', { name: 'Resume saved workspace' }).click();
  await expect(page.locator('[data-workspace-id]')).toHaveAttribute('data-workspace-id', id!);
  await expect(drawing).toHaveAttribute('data-revision', revision!);
  await expect(units).toHaveValue('Imperial');
  const access = await page.evaluate(async ({ id, former }) => {
    const { binding } = JSON.parse(sessionStorage.getItem('alfadata/workspace/v1')!);
    async function asset(value: typeof binding) {
      const response = await fetch('/api/workspaces/' + id + '/assets/drawing', { headers: {
        'X-Workspace-Tab-Id': value.tabId,
        'X-Workspace-Binding-Revision': String(value.bindingRevision),
        'X-Recovery-Generation': value.recoveryGeneration,
      } });
      return { status: response.status, cache: response.headers.get('cache-control') };
    }
    const token = await (await fetch('/api/browser-token', { method: 'POST' })).json();
    const path = '/api/workspaces/' + id;
    const headers = {
      'Content-Type': 'application/json', 'X-Alfadata-CSRF': token.token,
      'X-Workspace-Tab-Id': former.tabId,
      'X-Workspace-Binding-Revision': String(former.bindingRevision),
      'X-Recovery-Generation': former.recoveryGeneration,
    };
    const operation = { operationId: crypto.randomUUID(), operationSequence: 2, expectedRevision: 2, action: { type: 'back' } };
    const stale = await Promise.all([
      fetch(path, { headers }),
      fetch(path + '/actions', { method: 'POST', headers, body: JSON.stringify(operation) }),
      fetch(path + '/operations/status', { method: 'POST', headers, body: JSON.stringify(operation) }),
      fetch(path + '/search', { method: 'POST', headers, body: JSON.stringify({ query: 'elbow' }) }),
    ]);
    return {
      current: await asset(binding),
      former: await asset(former),
      wrongGeneration: await asset({ ...binding, recoveryGeneration: crypto.randomUUID() }),
      stale: stale.map(response => response.status),
    };
  }, { id, former });
  expect(access).toEqual({
    current: { status: 200, cache: 'private, no-store' },
    former: { status: 404, cache: 'private, no-store' },
    wrongGeneration: { status: 404, cache: 'private, no-store' },
    stale: [404, 404, 404, 404],
  });
  await expect(page.getByLabel('Engineering drawing')).toHaveAttribute('data-drawing-source', 'asset');
  for (const path of ['/api/engineering/assets/drawing', '/Database/Gensets/0.txt', '/Pipedata-Pro%2014.1.exe']) {
    expect((await page.request.get(path)).status(), path).toBe(404);
  }
});
