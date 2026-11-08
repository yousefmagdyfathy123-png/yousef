import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { mailLink, signIn, signUp } from './auth-fixture';
import {test as workspaceTest} from './ui-fixture';

test('reconciles a lost committed response without dispatching the action again', async ({ page }) => {
  const email = randomUUID() + '@example.invalid';
  await signUp(page, email);
  await page.goto(await mailLink(email, 'verify-email'));
  await signIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  await page.goto('/workspace');
  await page.getByRole('button', { name: 'Start 120-hour trial' }).click();
  await page.getByRole('button', { name: 'Open new workspace' }).click();
  const units = page.getByRole('combobox', { name: 'Units', exact: true });
  const drawing = page.getByRole('region', { name: 'Engineering workspace' });
  await expect(units).toHaveValue('Metric');
  const initialRevision = Number(await drawing.getAttribute('data-revision'));
  const requests: string[] = [];
  const inspections: string[] = [];
  await page.route('**/api/workspaces/*/operations/status', async route => {
    inspections.push(route.request().postData()!);
    await route.continue();
  });
  await page.route('**/api/workspaces/*/actions', async route => {
    requests.push(route.request().postData()!);
    if (requests.length === 1) {
      const committed = await route.fetch({ maxRedirects: 0 });
      expect(committed.status()).toBe(200);
      await route.abort();
    } else {
      await route.continue();
    }
  });

  await units.selectOption('Imperial');
  await expect(units).toHaveValue('Imperial');
  await expect(drawing).toHaveAttribute('data-revision', String(initialRevision + 1));
  expect(requests).toHaveLength(1);
  expect(inspections).toEqual(requests);

  await page.reload();
  await expect(drawing).toHaveAttribute('data-revision', String(initialRevision + 1));
  await units.selectOption('Metric');
  await expect(drawing).toHaveAttribute('data-revision', String(initialRevision + 2));
  expect(JSON.parse(requests[1]).operationSequence).toBe(2);

  // Lose the next response and reload before the pending action can be reconciled.
  await page.unroute('**/api/workspaces/*/actions');
  let notifyCommitted!: () => void;
  const didCommit = new Promise<void>(resolve => { notifyCommitted = resolve; });
  await page.route('**/api/workspaces/*/actions', async route => {
    requests.push(route.request().postData()!);
    const committed = await route.fetch({ maxRedirects: 0 });
    expect(committed.status()).toBe(200);
    await route.abort();
    notifyCommitted();
  });
  await units.selectOption('Imperial');
  await didCommit;
  await page.reload();
  await expect(units).toHaveValue('Imperial');
  await expect(units).toBeEnabled();
  await expect(drawing).toHaveAttribute('data-revision', String(initialRevision + 3));
  expect(requests).toHaveLength(3);
  expect(inspections).toContain(requests[2]);

  // Drop the request before it reaches PostgreSQL, then let reload recover it.
  await page.unroute('**/api/workspaces/*/actions');
  let dropped!: () => void;
  const didDrop = new Promise<void>(resolve => { dropped = resolve; });
  await page.route('**/api/workspaces/*/actions', async route => {
    requests.push(route.request().postData()!);
    if (requests.length === 4) {
      await route.abort();
      dropped();
    } else {
      await route.continue();
    }
  });
  await units.selectOption('Metric');
  await didDrop;
  await page.reload();
  await expect(units).toHaveValue('Metric');
  await expect(units).toBeEnabled();
  await expect(drawing).toHaveAttribute('data-revision', String(initialRevision + 4));
  expect(requests.slice(3)).toEqual([requests[3], requests[3]]);
  expect(inspections).toContain(requests[3]);

  // Exhaust automatic inspection while the request is offline. The explicit
  // recovery control must retry the same envelope when the connection returns.
  await page.unroute('**/api/workspaces/*/operations/status');
  let offlineInspections = 0;
  await page.route('**/api/workspaces/*/operations/status', async route => {
    if (++offlineInspections <= 3) return route.abort();
    await route.continue();
  });
  await page.unroute('**/api/workspaces/*/actions');
  await page.route('**/api/workspaces/*/actions', async route => {
    requests.push(route.request().postData()!);
    if (requests.length === 6) return route.abort();
    await route.continue();
  });
  await units.selectOption('Imperial');
  const manual = page.getByRole('button', { name: 'Check action status' });
  await expect(manual).toBeVisible();
  expect(offlineInspections).toBe(3);
  await expect(units).toBeDisabled();
  await expect(drawing).toHaveAttribute('data-revision', String(initialRevision + 4));
  await manual.click();
  await expect(units).toHaveValue('Imperial');
  await expect(units).toBeEnabled();
  await expect(drawing).toHaveAttribute('data-revision', String(initialRevision + 5));
  expect(requests.slice(5)).toEqual([requests[5], requests[5]]);
});

workspaceTest('late drawing asset cannot replace a newer fitted selection or its parameters',async({page,openWorkspace,baseURL})=>{
  workspaceTest.skip(new URL(baseURL!).protocol!=='https:','Uses the authenticated asset-backed workspace');
  let release!:()=>void,started!:()=>void,delivered!:()=>void;
  const held=new Promise<void>(resolve=>{release=resolve;}),received=new Promise<void>(resolve=>{started=resolve;}),finished=new Promise<void>(resolve=>{delivered=resolve;});
  let count=0;
  await page.route('**/api/workspaces/*/assets/drawing',async route=>{
    if(++count!==1){await route.continue();return;}
    const response=await route.fetch();
    const body=await response.body();started();await held;
    try{await route.fulfill({response,body});}catch{/* The obsolete request may already be aborted. */}finally{delivered();}
  });
  try{
    await openWorkspace();await received;
    const workspace=page.getByRole('region',{name:'Engineering workspace',exact:true});
    const revision=Number(await workspace.getAttribute('data-revision'));
    await page.getByLabel('Component',{exact:true}).selectOption('Flan2');
    await expect(workspace).toHaveAttribute('data-revision',String(revision+1));
    await expect(page.locator('[data-header="1"]')).toContainText('Slip-on');
    const canvas=page.getByLabel('Engineering drawing');await expect(canvas).toHaveAttribute('data-drawing-source','asset');
    const before=await canvas.evaluate(c=>(c as HTMLCanvasElement).toDataURL());
    const parameters=await page.locator('.engineering-toolbar select').evaluateAll(els=>els.map(e=>(e as HTMLSelectElement).value));
    release();await finished;
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    expect(await canvas.evaluate(c=>(c as HTMLCanvasElement).toDataURL())).toBe(before);
    expect(await page.locator('.engineering-toolbar select').evaluateAll(els=>els.map(e=>(e as HTMLSelectElement).value))).toEqual(parameters);
    await expect(workspace).toHaveAttribute('data-revision',String(revision+1));
    await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Flan2');
  }finally{release();}
});
