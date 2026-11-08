import { expect, test } from '@playwright/test';

// Task 1: node --import tsx tools/marketing/test-shell.ts installs/restores
// the plan-permitted temporary composition for this real-server acceptance.
// Task 2 runs the same acceptance against the composed homepage at /.
const home = process.env.ALFADATA_PUBLIC_SHELL_PATH ?? '/';
test('public shell preserves both original logos and company contact links', async ({ page }) => {
  await page.goto(home);
  await expect(page.getByRole('banner').getByRole('link', { name: /Alfadata.*home/ })).toBeVisible();
  for (const [src, width, height] of [['/brand/alfa-compact.png', 353, 140], ['/brand/alfa-full.png', 500, 221]] as const) {
    const logo = page.locator(`img[src="${src}"]`);
    await expect(logo).toBeVisible();
    await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(width);
    const dimensions = await logo.evaluate((image: HTMLImageElement) => ({
      width: image.clientWidth, height: image.clientHeight, naturalHeight: image.naturalHeight,
    }));
    expect(dimensions.naturalHeight).toBe(height);
    expect(Math.abs(dimensions.width / dimensions.height - width / height)).toBeLessThan(0.04);
  }
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: 'ALFA CORE', exact: true })).toHaveAttribute('href', 'https://www.alfa-sa.net/');
  await expect(footer.getByRole('link', { name: 'tech.supp@alfa-sa.net' })).toHaveAttribute('href', 'mailto:tech.supp@alfa-sa.net');
  await page.screenshot({ path: '.local/homepage-task1-desktop.png', fullPage: true });
});

test('mobile disclosure retains navigation, Escape focus and destination selection', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(home);
  const toggle = page.getByRole('button', { name: 'Menu', exact: true });
  const navigation = page.getByRole('navigation', { name: 'Mobile navigation' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation).toBeHidden();
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(navigation.getByRole('link', { name: 'Features', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(navigation).toBeHidden();
  await expect(toggle).toBeFocused();
  for (const [name, suffix] of [['Features', '#features'], ['Example', '#example'], ['Pricing', '/pricing']] as const) {
    await toggle.click();
    await navigation.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(suffix + '$'));
    if (suffix.startsWith('#')) {
      await expect(page.locator(suffix)).toBeInViewport();
      await expect(page.locator(suffix)).toBeFocused();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    }
    await page.goto(home);
  }
  await toggle.click();
  await page.screenshot({ path: '.local/homepage-task1-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await navigation.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
});
