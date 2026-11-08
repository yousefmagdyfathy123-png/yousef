import { runTestProcess, withTestDatabase } from './test-database';

process.exitCode = await withTestDatabase(url => runTestProcess([
  'node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.integration.config.ts', ...process.argv.slice(2),
], { ...process.env, DATABASE_URL: url, ALFADATA_TEST_DATABASE_URL: url }));
