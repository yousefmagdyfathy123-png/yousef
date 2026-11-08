import { randomUUID } from 'node:crypto';
import { expect, test } from './ui-fixture';
import { mailLink, signIn, signUp } from './auth-fixture';

test('protected Find returns ordered results and selects through workspace actions', async ({ page }) => {
  const email = randomUUID() + '@example.invalid';
  await signUp(page, email);
  await page.goto(await mailLink(email, 'verify-email'));
  await signIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  await page.goto('/workspace');
  await page.getByRole('button', { name: 'Start 120-hour trial' }).click();
  await page.getByRole('button', { name: 'Open new workspace' }).click();
  await page.getByRole('button', { name: 'Find', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Enter a component name or standard');
  const query = page.getByRole('textbox', { name: 'Find', exact: true });
  const find = page.getByRole('dialog').getByRole('button', { name: 'Find', exact: true });
  let notifyFirst!: () => void;
  let releaseFirst!: () => void;
  const first = new Promise<void>(resolve => { notifyFirst = resolve; });
  const release = new Promise<void>(resolve => { releaseFirst = resolve; });
  await page.route('**/api/workspaces/*/search', async route => {
    if (route.request().postDataJSON().query !== 'BLIND') return route.continue();
    const response = await route.fetch();
    notifyFirst();
    await release;
    await route.fulfill({ response }).catch(() => undefined);
  });
  await query.fill('BLIND');
  await find.click();
  await first;
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText('Searching\u2026');
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeEnabled();
  await query.fill('elbow');
  const search = page.waitForResponse(response => response.url().endsWith('/search') &&
    response.request().postDataJSON().query === 'elbow');
  await find.click();
  expect((await search).status()).toBe(200);
  const hits = page.getByRole('list', { name: 'Search results' }).getByRole('button');
  await expect(hits.first().locator('.search-result-title')).toHaveText('Buttwelded 45deg Elbow');
  await expect(hits.first()).toContainText('ASME B16.9');
  releaseFirst();
  await expect(hits.first().locator('.search-result-title')).toHaveText('Buttwelded 45deg Elbow');
  const select = page.waitForRequest(request => request.url().endsWith('/actions') &&
    request.postDataJSON()?.action?.type === 'select-route');
  await hits.first().focus();
  await page.keyboard.press('Enter');
  expect((await select).postDataJSON().action).toEqual({ type: 'select-route', routeId: 'Ftbw1' });
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('protected search retries failures and ignores a request closed with Escape', async ({page, openWorkspace}) => {
  await openWorkspace();
  const opener = page.getByRole('button', {name:'Find', exact:true});
  await opener.click();
  const dialog = page.getByRole('dialog');
  const query = dialog.getByRole('textbox', {name:'Find', exact:true});
  const submit = dialog.getByRole('button', {name:'Find', exact:true});
  await page.route('**/api/workspaces/*/search', route => route.fulfill({status:503, contentType:'application/json', body:'{}'}));
  await query.fill('BLIND'); await submit.click();
  await expect(dialog.getByRole('status')).toHaveText('Search could not be completed. Please try again.');
  await page.unroute('**/api/workspaces/*/search');
  await submit.click(); await expect(dialog.getByRole('status')).toHaveText('Search results ready.');
  let release!: () => void; let started!: () => void;
  const waiting = new Promise<void>(resolve => {started = resolve;});
  const gate = new Promise<void>(resolve => {release = resolve;});
  await page.route('**/api/workspaces/*/search', async route => {
    const response = await route.fetch(); started(); await gate;
    await route.fulfill({response}).catch(() => undefined);
  });
  await query.fill('elbow'); await submit.click(); await waiting;
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused();
  await page.unroute('**/api/workspaces/*/search');
  await opener.click();
  await query.fill('BLIND'); await submit.click(); await expect(dialog.getByRole('status')).toHaveText('Search results ready.');
  const focused = dialog.getByRole('textbox', {name:'Find', exact:true}); await focused.focus();
  release();
  await expect(dialog.getByRole('list').getByRole('button').first()).toContainText('Blind');
  await expect(focused).toBeFocused();
  await page.keyboard.press('Escape'); await expect(opener).toBeFocused();
});
