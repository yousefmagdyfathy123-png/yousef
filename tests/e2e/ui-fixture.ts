import { randomUUID } from 'node:crypto';
import { expect, test as base, type BrowserContext } from '@playwright/test';
import { mailLink, signIn, signUp } from './auth-fixture';

export const test = base.extend<
  { openWorkspace: () => Promise<void> },
  { verifiedSession: Awaited<ReturnType<BrowserContext['storageState']>> | undefined }
>({
  verifiedSession: [async ({ browser }, use, info) => {
    const options = info.project.use;
    if (new URL(options.baseURL!).protocol === 'http:') {
      await use(undefined);
      return;
    }
    const context = await browser.newContext({
      baseURL: options.baseURL, ignoreHTTPSErrors: options.ignoreHTTPSErrors,
    });
    let state: Awaited<ReturnType<BrowserContext['storageState']>>;
    try {
      const page = await context.newPage();
      const email = randomUUID() + '@example.invalid';
      await signUp(page, email);
      await page.goto(await mailLink(email, 'verify-email'));
      await signIn(page, email);
      await expect(page).toHaveURL(/\/account$/);
      await page.goto('/workspace');
      await page.getByRole('button', { name: 'Start 120-hour trial' }).click();
      await expect(page.getByRole('button', { name: 'Open new workspace' })).toBeVisible();
      state = await context.storageState();
    } finally {
      await context.close();
    }
    await use(state);
  }, { scope: 'worker' }],
  storageState: async ({ verifiedSession }, use) => use(verifiedSession),
  openWorkspace: async ({ page, baseURL, browser }, use, info) => {
    info.annotations.push({ type: 'browser-version', description: browser.version() });
    await use(async () => {
      if (new URL(baseURL!).protocol === 'http:') {
        await page.goto('/');
        return;
      }
      await page.goto('/workspace');
      await page.getByRole('button', { name: 'Open new workspace' }).click();
      await expect(page.locator('[data-workspace-id]')).toBeVisible();
    });
  },
});
export { expect };
