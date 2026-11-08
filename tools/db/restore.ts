import { Pool } from 'pg';
import { databaseUrl } from '../../src/server/db/url';
import { runPostgresTool } from './backup';

const [file, confirmDatabase] = process.argv.slice(2);
const url = databaseUrl();
const target = new URL(url);
if (!file || confirmDatabase !== target.host + target.pathname) {
  throw new Error('Usage: npm run db:restore -- <file.dump> <target-host[:port]/database>');
}

const pool = new Pool({ connectionString: url });
try {
  const { rows } = await pool.query(`SELECT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname NOT IN ('public', 'information_schema') AND nspname NOT LIKE 'pg_%'
    UNION ALL SELECT 1 FROM pg_class WHERE relnamespace = 'public'::regnamespace
    UNION ALL SELECT 1 FROM pg_proc WHERE pronamespace = 'public'::regnamespace
    UNION ALL SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace
  ) AS occupied`);
  if (rows[0].occupied) throw new Error('Restore requires an empty, app-owned database');
} finally {
  await pool.end();
}
await runPostgresTool('pg_restore', [
  '--dbname=' + decodeURIComponent(target.pathname.slice(1)), '--no-password', '--single-transaction',
  '--no-owner', '--no-privileges', '--', file,
], url);
