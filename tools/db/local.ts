import { randomBytes } from 'node:crypto';
import { access, mkdir, open, readFile, writeFile, unlink } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Pool } from 'pg';
import { databaseUrl } from '../../src/server/db/url';

const host = '127.0.0.1';

async function availablePort(): Promise<number> {
  const server = createServer();
  return new Promise((resolvePort, reject) => {
    server.once('error', reject);
    server.listen(0, host, () => {
      const address = server.address();
      server.close(error => {
        if (error || !address || typeof address === 'string') reject(error ?? new Error('No loopback port'));
        else resolvePort(address.port);
      });
    });
  });
}

export async function startLocalDb(): Promise<{ url: string; stop: () => Promise<void> }> {
  if (process.env.NODE_ENV === 'production') throw new Error('Production requires external PostgreSQL');
  const root = resolve('.local/postgres');
  const databaseDir = join(root, 'data');
  await mkdir(root, { recursive: true, mode: 0o700 });
  const lockPath = join(root, 'owner.lock');
  const lock = await open(lockPath, 'wx', 0o600);
  const release = async () => {
    await lock.close();
    await unlink(lockPath);
  };
  try {
    await lock.writeFile(String(process.pid));
    const credentials = join(root, 'password');
    let password: string;
    try {
      password = (await readFile(credentials, 'utf8')).trim();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      password = randomBytes(32).toString('hex');
      await writeFile(credentials, password, { flag: 'wx', mode: 0o600 });
    }
    if (!/^[0-9a-f]{64}$/.test(password)) throw new Error('Invalid local PostgreSQL credentials');
    const port = await availablePort();
    const { default: EmbeddedPostgres } = await import('embedded-postgres');
    let lastLog = '';
    const engine = new EmbeddedPostgres({
      databaseDir, port, user: 'alfadata', password, createPostgresUser: false,
      authMethod: 'scram-sha-256', persistent: true,
      initdbFlags: ['--encoding=UTF8', '--locale=C'],
      postgresFlags: ['-c', `listen_addresses=${host}`, '-c', 'unix_socket_directories=',
        '-c', 'password_encryption=scram-sha-256'],
      onLog: message => { lastLog = message.trim(); },
    });
    const initialized = await access(join(databaseDir, 'PG_VERSION')).then(() => true, error => {
      if (error.code === 'ENOENT') return false;
      throw error;
    });
    if (!initialized) await engine.initialise();
    try {
      await engine.start();
    } catch (error) {
      throw new Error(`Could not start loopback PostgreSQL. ${lastLog}`, { cause: error });
    }
    const maintenance = new Pool({ connectionString: `postgresql://alfadata:${password}@${host}:${port}/postgres` });
    try {
      try {
        const { rowCount } = await maintenance.query("SELECT 1 FROM pg_database WHERE datname = 'alfadata'");
        if (!rowCount) await maintenance.query('CREATE DATABASE alfadata');
      } finally {
        await maintenance.end();
      }
    } catch (error) {
      await engine.stop();
      throw error;
    }
    let stopped: Promise<void> | undefined;
    return {
      url: `postgresql://alfadata:${password}@${host}:${port}/alfadata`,
      stop: () => stopped ??= engine.stop().then(release),
    };
  } catch (error) {
    await release();
    throw error;
  }
}

export async function withDatabase<T>(run: (url: string) => Promise<T>): Promise<T> {
  if (process.env.DATABASE_URL || process.env.NODE_ENV === 'production') return run(databaseUrl());
  const local = await startLocalDb();
  try {
    return await run(local.url);
  } finally {
    await local.stop();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await withDatabase(async url => {
    const target = new URL(url);
    console.log(`PostgreSQL available at ${target.host}${target.pathname}.`);
    if (!process.env.DATABASE_URL) {
      const { writeFile, unlink } = await import('node:fs/promises');
      const filename = resolve('.local/postgres/connection-url');
      await writeFile(filename, url, { mode: 0o600 });
      console.log('Connection URL written to .local/postgres/connection-url. Press Ctrl+C to stop.');
      try {
        await new Promise<void>(resolveSignal => {
          const stop = () => {
            process.off('SIGINT', stop);
            process.off('SIGTERM', stop);
            resolveSignal();
          };
          process.on('SIGINT', stop);
          process.on('SIGTERM', stop);
        });
      } finally {
        await unlink(filename);
      }
    }
  });
}
