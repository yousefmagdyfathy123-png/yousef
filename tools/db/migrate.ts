import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Pool } from 'pg';
import { withDatabase } from './local';

export async function migrate(pool: Pool, directory = new URL('../../migrations/', import.meta.url)): Promise<void> {
  const files = (await readdir(directory)).filter(name => /^\d{3}-[a-z0-9-]+\.sql$/.test(name)).sort();
  if (!files.length || new Set(files.map(name => name.slice(0, 3))).size !== files.length) {
    throw new Error('Expected migrations with unique numbered IDs');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(371314, 13)');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const { rows } = await client.query<{ name: string; checksum: string }>(
      'SELECT name, checksum FROM schema_migrations ORDER BY name',
    );
    if (rows.some((row, index) => row.name !== files[index])) {
      throw new Error('Applied migrations must be an unchanged prefix of the migration directory');
    }
    for (const [index, name] of files.entries()) {
      const sql = (await readFile(new URL(name, directory), 'utf8')).replace(/\r\n/g, '\n');
      const checksum = createHash('sha256').update(sql).digest('hex');
      if (rows[index]) {
        if (rows[index].checksum !== checksum) throw new Error(`Migration checksum mismatch: ${name}`);
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [name, checksum]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await withDatabase(async url => {
    const pool = new Pool({ connectionString: url });
    try {
      await migrate(pool);
      console.log('Database migrations are current.');
    } finally {
      await pool.end();
    }
  });
}
