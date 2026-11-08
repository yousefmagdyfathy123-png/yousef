import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';

export const initialPassword = 'An initial long password';

export async function mailLink(email: string, path: string) {
  let url: string | undefined;
  await expect.poll(async () => {
    const data = await readFile(join(process.env.ALFADATA_AUTH_TEST_DIR!, 'mail.jsonl'), 'utf8').catch(error => {
      if (error.code === 'ENOENT') return '';
      throw error;
    });
    for (const line of data.trim().split('\n').filter(Boolean).reverse()) {
      const { recipient, text } = JSON.parse(line) as { recipient: string; text: string };
      if (recipient !== email) continue;
      const match = text.match(/https:\/\/127\.0\.0\.1:3187\/api\/auth\/\S+/)?.[0];
      if (match && new URL(match).pathname.startsWith('/api/auth/' + path)) {
        url = match;
        return true;
      }
    }
    return false;
  }).toBe(true);
  return url!;
}

export async function signUp(page: Page, email: string) {
  await page.goto('/sign-up');
  await page.getByLabel('Name').fill('Example Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(initialPassword);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('status')).toHaveText('Check your email for a confirmation link.');
}

export async function signIn(page: Page, email: string, password = initialPassword) {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}
