import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { mailLink, signIn, signUp } from './auth-fixture';

test('account defaults persist and a stale form must reload the saved snapshot', async ({ page, context }) => {
  const email = randomUUID() + '@example.invalid';
  await signUp(page, email);
  await page.goto(await mailLink(email, 'verify-email'));
  await signIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  await page.goto('/account');
  const original = await context.newPage();
  await original.goto('/workspace');
  await original.getByRole('button', { name: 'Start 120-hour trial' }).click();
  await original.getByRole('button', { name: 'Open new workspace' }).click();
  const workspace = original.locator('[data-workspace-id]');
  await expect(workspace).toBeVisible();
  const originalId = await workspace.getAttribute('data-workspace-id');
  await expect(original.getByLabel('Workspace settings')).toHaveText('Metric, Inches, Celsius');
  const stale = await context.newPage();
  await stale.goto('/account');

  const action = 'Save defaults for new workspaces';
  await expect(page.getByLabel('Units', { exact: true })).toHaveValue('Metric');
  await page.getByLabel('Units', { exact: true }).selectOption('Imperial');
  await page.getByRole('button', { name: action }).click();
  await expect(page.getByRole('region', { name: 'New workspace defaults' }).getByRole('status')).toHaveText('Defaults saved for new workspaces.');

  await original.reload();
  await expect(workspace).toHaveAttribute('data-workspace-id', originalId!);
  await expect(original.getByLabel('Workspace settings')).toHaveText('Metric, Inches, Celsius');
  const next = await context.newPage();
  await next.goto('/workspace');
  await next.getByRole('button', { name: 'Open new workspace' }).click();
  await expect(next.getByLabel('Workspace settings')).toHaveText('Imperial, Inches, Celsius');

  const denied = await stale.evaluate(async () => (await fetch('/api/account/preferences', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
  })).status);
  expect(denied).toBe(403);

  await stale.getByLabel('Temperature').selectOption('Fahrenheit');
  await stale.getByRole('button', { name: action }).click();
  await expect(stale.getByRole('region', { name: 'New workspace defaults' }).getByRole('status')).toContainText('Defaults changed in another session.');
  await expect(stale.getByRole('button', { name: action })).toBeDisabled();
  await stale.getByRole('button', { name: 'Load saved defaults' }).click();
  await expect(stale.getByLabel('Units', { exact: true })).toHaveValue('Imperial');
  await expect(stale.getByLabel('Temperature')).toHaveValue('Celsius');
  await stale.route('**/api/account/preferences', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    const committed = await route.fetch();
    expect(committed.status()).toBe(200);
    await route.abort();
  });
  await stale.getByLabel('Temperature').selectOption('Fahrenheit');
  await stale.getByRole('button', { name: action }).click();
  await expect(stale.getByRole('region', { name: 'New workspace defaults' }).getByRole('status'))
    .toContainText('The save was not confirmed.');
  await expect(stale.getByLabel('Temperature')).toHaveValue('Fahrenheit');
  await expect(stale.getByRole('button', { name: action })).toBeDisabled();
});
