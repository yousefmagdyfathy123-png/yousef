import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.ALFADATA_AUTH_TEST_DIR ??= mkdtempSync(join(tmpdir(), 'alfadata-auth-'));
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['homepage.spec.ts', 'mobile.spec.ts', 'desktop.spec.ts', 'auth.spec.ts', 'request-protection.spec.ts', 'payment-recovery.spec.ts', 'preferences.spec.ts', 'account-commerce.spec.ts', 'workspace-recovery.spec.ts', 'workspace-network.spec.ts', 'workspace-session-resume.spec.ts', 'search.spec.ts', 'culture.spec.ts', 'performance.spec.ts', 'perf-load.spec.ts', 'drawing-layout.spec.ts', 'drawing-focus.spec.ts', 'workspace-focus.spec.ts', 'workspace-usability.spec.ts', 'print.spec.ts', 'workspace-layout.spec.ts', 'results-accessibility.spec.ts'],
  timeout: 90_000,
  expect: { timeout: 25_000 },
  workers: 1,
  use: { channel: 'chrome', baseURL: 'https://127.0.0.1:3187', ignoreHTTPSErrors: true },
  globalTeardown: './tools/auth/test-cleanup.ts',
  webServer: {
    command: 'node --import tsx tools/auth/test-server.ts',
    url: 'https://127.0.0.1:3187',
    ignoreHTTPSErrors: true,
    timeout: 120_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
  },
});
