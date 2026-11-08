import { spawn } from 'node:child_process';
import { open, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { databaseUrl } from '../../src/server/db/url';

export async function runPostgresTool(
  command: 'pg_dump' | 'pg_restore', args: string[], url: string, outputFd?: number,
): Promise<void> {
  const target = new URL(url);
  const database = decodeURIComponent(target.pathname.slice(1));
  if (!/^[a-zA-Z_][a-zA-Z_0-9-]*$/.test(database)) {
    throw new Error('PostgreSQL utilities require a simple database name');
  }
  const sslMode = target.searchParams.get('sslmode');
  if ([...target.searchParams.keys()].some(key => key !== 'sslmode')) {
    throw new Error('PostgreSQL utilities accept only the sslmode URL option');
  }
  if (!target.username) throw new Error('PostgreSQL utilities require an explicit database user');
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PGHOST: target.hostname.replace(/^\[|\]$/g, ''),
    PGPORT: target.port || '5432',
    PGUSER: decodeURIComponent(target.username),
    PGPASSWORD: decodeURIComponent(target.password),
    PGDATABASE: database,
    PGSSLMODE: sslMode ?? process.env.PGSSLMODE,
  };
  // Connection details must all come from the target, including when a service was exported.
  delete env.PGSERVICE;
  delete env.PGHOSTADDR;
  const child = spawn(command, args, {
    env,
    stdio: ['ignore', outputFd ?? 'inherit', 'inherit'],
  });
  await new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed (exit ${code ?? 'by signal'})`));
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file] = process.argv.slice(2);
  if (!file) throw new Error('Usage: npm run db:backup -- <new-file.dump>');
  const url = databaseUrl();
  const output = await open(file, 'wx', 0o600);
  try {
    try {
      await runPostgresTool('pg_dump', ['--format=custom', '--no-password'], url, output.fd);
    } finally {
      await output.close();
    }
  } catch (error) {
    await unlink(file);
    throw error;
  }
}
