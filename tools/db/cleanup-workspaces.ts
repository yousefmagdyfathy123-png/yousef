import { pathToFileURL } from 'node:url';
import { Pool } from 'pg';
import { databaseUrl } from '../../src/server/db/url';

export async function cleanupExpiredWorkspaces(db: Pool): Promise<number> {
  // PostgreSQL rechecks this predicate if a concurrent activity update wins the row lock.
  const result = await db.query('DELETE FROM workspaces WHERE expires_at <= clock_timestamp()');
  return result.rowCount ?? 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = new Pool({ connectionString: databaseUrl() });
  try {
    console.log(`Expired workspaces deleted: ${await cleanupExpiredWorkspaces(db)}`);
  } finally {
    await db.end();
  }
}
