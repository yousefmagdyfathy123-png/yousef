import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { cpus, freemem, release, totalmem, version } from 'node:os';
import { expect, test, type Page } from '@playwright/test';
import { Pool } from 'pg';
import { summarize } from '../../tools/performance/measurements';
import { mailLink, signIn, signUp } from './auth-fixture';

const limits = { concurrency: [1, 2, 4], requests: 24, stageMs: 30_000, requestMs: 8_000,
  freeRamBytes: 384 * 1024 ** 2, cpuBusyFraction: 0.95 };

type Client = { page: Page; revision: number; sequence: number; token: string };

function cpuTimes() {
  return cpus().reduce(({ idle, total }, { times }) => ({
    idle: idle + times.idle, total: total + Object.values(times).reduce((sum, value) => sum + value, 0),
  }), { idle: 0, total: 0 });
}

async function changeClass(client: Client) {
  const operation = {
    operationId: randomUUID(), operationSequence: client.sequence + 1, expectedRevision: client.revision,
    action: { type: 'select-option', controlId: 'ASMEClass', value: client.sequence % 2 === 0 ? '600#' : '300#' },
  };
  const result = await client.page.evaluate(async ({ operation, token, timeout }) => {
    const { id, binding } = JSON.parse(sessionStorage.getItem('alfadata/workspace/v1')!);
    const body = JSON.stringify(operation);
    const start = performance.now();
    const response = await fetch('/api/workspaces/' + id + '/actions', {
      method: 'POST', body, signal: AbortSignal.timeout(timeout),
      headers: {
        'Content-Type': 'application/json', 'X-Alfadata-CSRF': token,
        'X-Workspace-Tab-Id': binding.tabId, 'X-Workspace-Binding-Revision': String(binding.bindingRevision),
        'X-Recovery-Generation': binding.recoveryGeneration,
      },
    });
    const bytes = await response.arrayBuffer();
    const elapsedMs = performance.now() - start;
    if (!response.ok) throw new Error('Workspace action returned HTTP ' + response.status);
    const dto = JSON.parse(new TextDecoder().decode(bytes));
    return { elapsedMs, requestBytes: new TextEncoder().encode(body).byteLength,
      responseBytes: bytes.byteLength, revision: dto.revision,
      sequence: Number(response.headers.get('X-Workspace-Operation-Sequence')), header: dto.view.headers[0] };
  }, { operation, token: client.token, timeout: limits.requestMs });
  expect(result.sequence).toBe(operation.operationSequence);
  expect(result.revision).toBe(client.revision + 1);
  expect(result.header).toContain(operation.action.value);
  client.sequence = result.sequence;
  client.revision = result.revision;
  return result;
}

async function storage(pool: Pool) {
  const { rows: [row] } = await pool.query(`
    SELECT (SELECT count(*)::int FROM workspaces) AS workspaces,
      (SELECT coalesce(sum(octet_length(encoded_state::text)), 0)::text FROM workspaces) AS "stateJsonBytes",
      (SELECT count(*)::int FROM workspace_operation_receipts) AS receipts,
      (SELECT coalesce(sum(octet_length(public_result::text)), 0)::text FROM workspace_operation_receipts) AS "receiptJsonBytes",
      pg_relation_size('workspaces')::text AS "workspaceHeapBytes",
      pg_relation_size('workspace_operation_receipts')::text AS "receiptHeapBytes",
      pg_indexes_size('workspaces')::text AS "workspaceIndexBytes",
      pg_indexes_size('workspace_operation_receipts')::text AS "receiptIndexBytes",
      (SELECT coalesce(sum(n_dead_tup), 0)::text FROM pg_stat_user_tables
        WHERE relname IN ('workspaces', 'workspace_operation_receipts')) AS "estimatedDeadTuples",
      pg_current_wal_lsn()::text AS wal
  `);
  return row;
}

test('measure bounded protected workspace action stages', async ({ browser, baseURL }) => {
  test.setTimeout(300_000);
  expect(new URL(baseURL!).origin).toBe('https://127.0.0.1:3187');
  const db = process.env.ALFADATA_TEST_DATABASE_URL;
  const target = process.env.ALFADATA_PERF_SAMPLE_FILE;
  if (!db || !target || !/^\/alfadata_test_[a-f0-9]{32}$/.test(new URL(db).pathname)) {
    throw new Error('Run npm run perf:load against the isolated fixture');
  }
  const pool = new Pool({ connectionString: db });
  const clients: Client[] = [];
  const stages = [];
  try {
    for (const concurrency of limits.concurrency) {
      while (clients.length < concurrency) {
        const context = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
        const page = await context.newPage();
        const email = randomUUID() + '@example.invalid';
        await signUp(page, email);
        await page.goto(await mailLink(email, 'verify-email'));
        await signIn(page, email);
        await expect(page).toHaveURL(/\/account$/);
        await page.goto('/workspace');
        await page.getByRole('button', { name: 'Start 120-hour trial' }).click();
        await page.getByRole('button', { name: 'Open new workspace' }).click();
        const workspace = page.getByRole('region', { name: 'Engineering workspace' });
        await expect(workspace).toBeVisible();
        const revision = Number(await workspace.getAttribute('data-revision'));
        const token = await page.evaluate(async () => {
          const response = await fetch('/api/browser-token', { method: 'POST' });
          if (!response.ok) throw new Error('Browser token request failed');
          return (await response.json()).token as string;
        });
        clients.push({ page, revision, sequence: 0, token });
      }
      const before = await storage(pool);
      const start = performance.now();
      let previousCpu = cpuTimes();
      let maxCpuBusy = 0;
      let minFreeRam = freemem();
      let stopReason: string | undefined;
      let failures = 0;
      const observations: Awaited<ReturnType<typeof changeClass>>[] = [];
      for (let sent = 0; sent < limits.requests; sent += concurrency) {
        minFreeRam = Math.min(minFreeRam, freemem());
        const now = cpuTimes();
        if (now.total > previousCpu.total) {
          maxCpuBusy = Math.max(maxCpuBusy, 1 - (now.idle - previousCpu.idle) / (now.total - previousCpu.total));
        }
        previousCpu = now;
        if (performance.now() - start >= limits.stageMs) stopReason = 'time limit';
        if (minFreeRam < limits.freeRamBytes) stopReason = 'low free host RAM';
        if (maxCpuBusy > limits.cpuBusyFraction) stopReason = 'host CPU busy limit';
        if (stopReason) break;
        const batch = await Promise.allSettled(clients.slice(0, concurrency).map(changeClass));
        for (const response of batch) {
          if (response.status === 'fulfilled') observations.push(response.value);
          else { failures++; stopReason = String(response.reason); }
        }
        if (stopReason) break;
      }
      const elapsedMs = performance.now() - start;
      const after = await storage(pool);
      const { rows: [wal] } = await pool.query('SELECT pg_wal_lsn_diff($1, $2)::text AS bytes', [after.wal, before.wal]);
      stages.push({ concurrency, elapsedMs, completed: observations.length, failures, stopReason,
        requestsPerSecond: observations.length * 1000 / elapsedMs, maxCpuBusy, minFreeRam, before, after,
        walBytes: wal.bytes,
        metrics: observations.length ? {
          latencyMs: summarize(observations.map(row => row.elapsedMs)),
          requestBytes: summarize(observations.map(row => row.requestBytes)),
          responseBytes: summarize(observations.map(row => row.responseBytes)),
        } : undefined });
      if (stopReason) break;
    }
  } finally {
    await pool.end();
  }
  const report = {
    schemaVersion: 1, limits, stages,
    environment: { node: process.version, os: version() + ' ' + release(), cpu: cpus()[0].model,
      logicalCpus: cpus().length, ramBytes: totalmem(), browser: 'Chrome ' + browser.version(),
      transport: 'loopback HTTPS', database: 'isolated PostgreSQL' },
    method: { latency: 'same-origin fetch to full body read', bytes: 'uncompressed body bytes, excluding headers',
      storage: 'PostgreSQL live JSON text lengths and allocated relation sizes, separate from WAL delta' },
  };
  writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
});
