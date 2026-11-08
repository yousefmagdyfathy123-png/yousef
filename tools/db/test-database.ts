import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { withDatabase } from './local';

export async function withTestDatabase<T>(run: (url: string) => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV === 'production') throw new Error('Tests require a development database');
  return withDatabase(async url => {
    const admin = new Pool({ connectionString: url });
    const name = `alfadata_test_${randomUUID().replaceAll('-', '')}`;
    try {
      await admin.query(`CREATE DATABASE "${name}"`);
      try {
        const testUrl = new URL(url);
        testUrl.pathname = `/${name}`;
        return await run(testUrl.href);
      } finally {
        await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
      }
    } finally {
      await admin.end();
    }
  });
}

export async function runTestProcess(args: string[], env: NodeJS.ProcessEnv, signal?: AbortSignal): Promise<number> {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env });
  const stop = () => child.kill();
  signal?.addEventListener('abort', stop, { once: true });
  if (signal?.aborted) stop();
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  try {
    return await new Promise<number>((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', code => resolve(code ?? 1));
    });
  } finally {
    signal?.removeEventListener('abort', stop);
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
  }
}
