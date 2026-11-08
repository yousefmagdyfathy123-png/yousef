import { join } from 'node:path';
import { Pool } from 'pg';
import { uiProjectNames } from '../release/ui-matrix';
import { migrate } from '../db/migrate';
import { runTestProcess, withTestDatabase } from '../db/test-database';

const build = await runTestProcess(['node_modules/next/dist/bin/next', 'build'], {
  ...process.env, LEGACY_CULTURE: 'en-US',
});

function run(args: string[], group?: string, ui?: { project: string; report: string }) {
  const directory = process.env.ALFADATA_FUNCTIONAL_BROWSER_REPORTS;
  const report = directory && group ? join(directory, 'browser-' + group + '.json') : undefined;
  const config = ui ? 'playwright.ui.config.ts' : 'playwright.auth.config.ts';
  return withTestDatabase(async url => {
    const database = new Pool({ connectionString: url });
    try { await migrate(database); } finally { await database.end(); }
    return runTestProcess([
      'node_modules/@playwright/test/cli.js', 'test', '--config', config, ...args, ...(report ? ['--reporter=line,json'] : []),
    ], {
      ...process.env, ALFADATA_TEST_DATABASE_URL: url,
      ...(report ? { PLAYWRIGHT_JSON_OUTPUT_FILE: report } : {}),
      ...(ui ? { ALFADATA_UI_PROJECT: ui.project, PLAYWRIGHT_JSON_OUTPUT_FILE: ui.report } : {}),
    });
  });
}

const args = process.argv.slice(2);
// The loopback fixture shares Better Auth's per-path rate bucket. Give the
// account scenarios a fresh isolated server and database for the default run.
const uiReports = process.env.ALFADATA_UI_BROWSER_REPORTS;
async function runUiMatrix(directory: string) {
  let failed = false;
  for (const project of uiProjectNames) {
    const exit = await run(['--project', project, '--reporter=line,json',
      '--output', join(directory, 'screenshots', project), ...args], undefined, {
      project, report: join(directory, project + '.json'),
    });
    failed ||= exit !== 0;
  }
  return Number(failed);
}
process.exitCode = build || (uiReports ? await runUiMatrix(uiReports) : args.length ? await run(args) :
  await run(['auth.spec.ts', 'request-protection.spec.ts', 'payment-recovery.spec.ts'], 'identity') ||
  await run(['account-commerce.spec.ts', 'preferences.spec.ts'], 'account') ||
  await run(['workspace-recovery.spec.ts'], 'recovery') ||
  await run(['workspace-network.spec.ts'], 'network') ||
  await run(['workspace-session-resume.spec.ts'], 'resume') ||
  await run(['culture.spec.ts'], 'culture') ||
  await run(['drawing-layout.spec.ts', 'drawing-focus.spec.ts', 'workspace-focus.spec.ts', 'workspace-usability.spec.ts', 'print.spec.ts', 'workspace-layout.spec.ts', 'search.spec.ts', 'results-accessibility.spec.ts', 'desktop.spec.ts', 'mobile.spec.ts'], 'drawings'));
