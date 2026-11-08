import { expect, test } from './ui-fixture';

test('protected text results match the drawing revision through copy, settings and reload', async ({
  page, openWorkspace,
}) => {
  await openWorkspace();
  const workspace = page.getByRole('region', { name: 'Engineering workspace' });
  const results = page.locator('[data-results-revision]');
  const table = page.getByRole('table', { name: 'Displayed engineering results' });
  // Independently extracted reference case Flan1-0.
  await expect(table.getByRole('row').nth(1).getByRole('cell')).toHaveText(['19.9', 'kg', 'Copy']);
  await expect(table.getByRole('row').nth(2).getByRole('cell')).toHaveText(['4.86', 'kg', 'Copy']);
  const initial = (await workspace.getAttribute('data-revision'))!;
  const canvas = page.getByLabel('Engineering drawing');
  const geometry = await canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());

  await page.evaluate(() => {
    const copies: string[] = [];
    Object.defineProperty(window, 'qaCopies', { value: copies });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (value: string) => { copies.push(value); },
    } });
  });
  await table.getByRole('button', { name: /^Copy Flange Wt/ }).click();
  await page.getByRole('button', { name: 'Copy all results' }).click();
  const copies = await page.evaluate(() => (window as Window & { qaCopies?: string[] }).qaCopies);
  expect(copies).toEqual([
    'Flange Wt =  \t19.9\tkg',
    'Result\tValue\tUnit\nFlange Wt =  \t19.9\tkg\nS/Bolts and Nuts =  \t4.86\tkg',
  ]);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
    writeText: async () => { throw new Error('Clipboard denied'); },
  } }));
  await page.getByRole('button', { name: 'Copy all results' }).click();
  await expect(results.getByRole('status').filter({ hasText: 'Select the result text' })).toBeVisible();
  await expect(table).toHaveCSS('user-select', 'text');

  const summary = page.locator('.results-panel summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(table).toBeHidden();
  await expect(summary).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(results).toHaveAttribute('data-results-revision', initial);
  expect(await canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL())).toBe(geometry);

  const units = page.getByLabel('Units', { exact: true });
  const action = page.waitForResponse(response => /\/actions?$/.test(response.url()) &&
    response.request().method() === 'POST');
  await units.selectOption('Imperial');
  const response = await action;
  expect(response.status()).toBe(200);
  expect(await response.text()).not.toMatch(/sourceRefs|sourceHash|activeDba|lineMem|DataBaseName|audit\/|operationReceipt/);
  await expect(table.getByRole('row').nth(1).getByRole('cell').nth(1)).toHaveText('lb');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Inch Fractions', { exact: true }).selectOption('Yes');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const revision = (await workspace.getAttribute('data-revision'))!;
  expect(Number(revision)).toBeGreaterThan(Number(initial));
  await expect(results).toHaveAttribute('data-results-revision', revision);

  if (new URL(page.url()).protocol === 'https:') {
    await page.reload();
    await expect(workspace).toHaveAttribute('data-revision', revision);
    await expect(results).toHaveAttribute('data-results-revision', revision);
    await expect(units).toHaveValue('Imperial');
  }

  await page.getByLabel('ASME Class', { exact: true }).selectOption('150#');
  await page.getByLabel('Size', { exact: true }).selectOption('5');
  await page.getByLabel('Face Type', { exact: true }).selectOption('RTJ');
  await expect(results.getByRole('status').filter({ hasText: 'Not manufactured with the selected parameters' })).toBeVisible();
  await expect(table).toHaveCount(0);
  await expect(results).toHaveAttribute('data-results-revision', (await workspace.getAttribute('data-revision'))!);
});
