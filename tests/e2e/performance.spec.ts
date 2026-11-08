import { cpus, totalmem, version, release } from 'node:os';
import { readFileSync, writeFileSync } from 'node:fs';
import type { Request } from '@playwright/test';
import { summarize } from '../../tools/performance/measurements';
import { expect, test } from './ui-fixture';

test('measure a protected create, calculate, search and reload journey', async ({ page, browser, baseURL, context }) => {
  expect(new URL(baseURL!).origin).toBe('https://127.0.0.1:3187');
  test.setTimeout(300_000);
  const warmups = 3;
  const measured = 15;
  const samples: Record<string, number[]> = {};
  const requests: Promise<{ route: string; waitMs: number; requestBodyBytes: number; responseBodyBytes: number }>[] = [];
  let sample = -1;
  page.on('requestfinished', (request: Request) => {
    const path = new URL(request.url()).pathname;
    const route = /^\/api\/workspaces(?:\/[^/]+)?(?:\/(actions|search))?$/.exec(path);
    if (sample <= warmups || !route) return;
    requests.push((async () => {
      const sizes = await request.sizes();
      const timing = request.timing();
      return { route: route[1] ?? request.method(), waitMs: timing.responseStart - timing.requestStart,
        requestBodyBytes: sizes.requestBodySize, responseBodyBytes: sizes.responseBodySize };
    })());
  });
  async function measure(phase: string, run: () => Promise<void>) {
    const start = performance.now();
    await run();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    if (sample > warmups || sample === 0) (samples[sample === 0 ? 'first.' + phase : phase] ??= []).push(performance.now() - start);
  }
  const workspace = page.getByRole('region', { name: 'Engineering workspace' });
  const component = page.getByLabel('Component', { exact: true });
  const canvas = page.getByLabel('Engineering drawing');
  for (sample = 0; sample <= warmups + measured; sample++) {
    if (sample > 0) await page.evaluate(() => sessionStorage.removeItem('alfadata/workspace/v1'));
    await page.goto('/workspace');
    await measure('create', async () => {
      await page.getByRole('button', { name: 'Open new workspace' }).click();
      await expect(component).toHaveValue('Flan1');
      await expect(page.getByRole('table').getByRole('cell', { name: '19.9', exact: true })).toBeVisible();
      await expect(canvas).toBeVisible();
    });
    await measure('changeClass', async () => {
      await page.getByLabel('ASME Class', { exact: true }).selectOption('600#');
      await expect(page.locator('[data-header="1"]')).toContainText('600#');
    });
    await measure('search', async () => {
      await page.getByRole('button', { name: 'Find', exact: true }).click();
      await page.getByRole('textbox', { name: 'Find', exact: true }).fill('elbow');
      await page.getByRole('dialog').getByRole('button', { name: 'Find', exact: true }).click();
      await expect(page.getByRole('list', { name: 'Search results' }).getByRole('button').first()).toHaveText('Buttwelded 45deg Elbow');
    });
    await measure('selectSearchHit', async () => {
      await page.getByRole('button', { name: 'Buttwelded 45deg Elbow', exact: true }).click();
      await expect(component).toHaveValue('Ftbw1');
      await expect(canvas).toBeVisible();
    });
    const revision = (await workspace.getAttribute('data-revision'))!;
    await measure('reload', async () => {
      await page.reload();
      await expect(component).toHaveValue('Ftbw1');
      await expect(workspace).toHaveAttribute('data-revision', revision);
      await expect(canvas).toBeVisible();
    });
  }
  const restartFile = process.env.ALFADATA_PERF_RESTART_FILE!;
  const memoryFile = process.env.ALFADATA_PERF_MEMORY_FILE!;
  const latestPid = () => JSON.parse(readFileSync(memoryFile, 'utf8').trim().split('\n').at(-1)!).pid;
  const oldPid = latestPid();
  const id = (await page.locator('[data-workspace-id]').getAttribute('data-workspace-id'))!;
  const revision = (await workspace.getAttribute('data-revision'))!;
  const started = performance.now();
  writeFileSync(restartFile, '');
  await expect.poll(latestPid, { timeout: 30_000 }).not.toBe(oldPid);
  await expect.poll(async () => {
    try { return (await page.request.get('/sign-in')).status(); } catch { return 0; }
  }, { timeout: 30_000 }).toBe(200);
  const restartReadyMs = performance.now() - started;
  const saved = await page.evaluate(() => sessionStorage.getItem('alfadata/workspace/v1'));
  expect(saved).toBeTruthy();
  const resumed = await context.newPage();
  await resumed.addInitScript(value => {
    if (value && !sessionStorage.getItem('alfadata/workspace/v1')) sessionStorage.setItem('alfadata/workspace/v1', value);
  }, saved);
  await resumed.goto('/workspace');
  const resumeStart = performance.now();
  await resumed.getByRole('button', { name: 'Resume saved workspace' }).click({ timeout: 15_000 });
  await expect(resumed.locator('[data-workspace-id]')).toHaveAttribute('data-workspace-id', id);
  await expect(resumed.getByRole('region', { name: 'Engineering workspace' })).toHaveAttribute('data-revision', revision);
  await expect(resumed.getByLabel('Component', { exact: true })).toHaveValue('Ftbw1');
  const restart = { restartReadyMs, resumeMs: performance.now() - resumeStart, verified: true };
  const heavyStart = performance.now();
  const menu = resumed.getByRole('navigation', { name: 'Engineering menu' });
  await menu.getByText('Menu', { exact: true }).click();
  await menu.getByText('Flanges', { exact: true }).click();
  await menu.getByRole('button', { name: 'Hub and Clamp', exact: true }).click();
  await expect(resumed.locator('[data-header="1"]')).toContainText('12"NPS Hub and Clamp Pipe Connector');
  await expect(resumed.getByRole('table').getByRole('cell', { name: '193', exact: true })).toBeVisible();
  await expect(resumed.getByLabel('Engineering drawing')).toBeVisible();
  const representativeDrawing = { fixture: 'Flhb1-0', actionMs: performance.now() - heavyStart, verified: true };
  await resumed.close();
  const rawRequests = await Promise.all(requests);
  const result = {
    schemaVersion: 1,
    environment: { node: process.version, os: version() + ' ' + release(), cpu: cpus()[0].model,
      logicalCpus: cpus().length, ramBytes: totalmem(), browser: 'Chrome ' + browser.version(),
      viewport: page.viewportSize(), dpr: await page.evaluate(() => devicePixelRatio),
      transport: 'loopback HTTPS', database: 'isolated PostgreSQL', concurrency: 1 },
    method: { warmups, measured, first: 'first observed workspace journey after verification and trial setup',
      latency: 'Playwright action through asserted DOM and two animation frames, in milliseconds',
      request: 'Browser requestStart to responseStart, in milliseconds, includes server and network',
      bytes: 'Playwright request and received encoded response body bytes, excludes headers' },
    scenarios: ['Flan1-0 reference weight 19.9 kg', 'Flan1 class 600', 'elbow search and Ftbw1 selection', 'committed revision after reload'],
    phases: Object.fromEntries(Object.entries(samples).map(([phase, values]) => [phase, summarize(values)])),
    samples, rawRequests, restart, representativeDrawing,
  };
  const target = process.env.ALFADATA_PERF_SAMPLE_FILE;
  if (!target) throw new Error('Run npm run perf:baseline');
  writeFileSync(target, JSON.stringify(result, null, 2) + '\n');
});
