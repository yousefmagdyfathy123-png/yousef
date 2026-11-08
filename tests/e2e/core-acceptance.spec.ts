import { expect, test } from '@playwright/test';
import { loadFlangeCases } from '../reference/flange-cases';

test('non-search dispatch, stale Find result and flange recovery use the public workspace', async ({page}) => {
  await page.goto('/');
  const component = page.getByLabel('Component', {exact:true});
  await expect(component).toHaveValue('Flan1');
  await page.getByText('Menu', {exact:true}).click();
  await page.getByRole('button', {name:'ASME Composite', exact:true}).click();
  await expect(component).toHaveValue('Comp1');
  await expect(page.locator('[data-header="1"]')).toContainText('ASME Composite');

  await page.getByRole('button', {name:'Back', exact:true}).click();
  await expect(component).toHaveValue('Flan1');
  await page.getByRole('button', {name:'Find', exact:true}).click();
  await page.getByRole('textbox', {name:'Find', exact:true}).fill('Spectacle Blind');
  await page.getByRole('dialog').getByRole('button', {name:'Find', exact:true}).click();

  const action = page.waitForResponse(response => response.url().endsWith('/action') && response.request().method()==='POST' && response.request().postDataJSON()?.routeId==='Blnd1');
  await page.getByRole('list', {name:'Search results'}).getByRole('button', {name:/Spectacle Blind/}).first().click();
  const response = await action;
  expect(response.ok()).toBe(true);
  const result = await response.json();
  expect(result.ui.routeId).toBe('Blnd1');
  expect(result.view.headers.slice(0,6)).toEqual(Array(6).fill(''));
  expect(result.view.drawing).toEqual(loadFlangeCases('Flan1')[0].expected.view.drawing);
  await expect(page.getByLabel('Engineering drawing')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', {name:'Back', exact:true}).click();
  await expect(component).toHaveValue('Comp1');
  await page.getByRole('button', {name:'Back', exact:true}).click();
  await expect(component).toHaveValue('Flan1');
  await expect(page.locator('[data-header="1"]')).toHaveText(loadFlangeCases('Flan1')[0].expected.view.headers[0]);
});
