import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from 'vitest';
import { trialIdentity } from '../../src/server/access/trial-identity';
import { initializeLocalRegistry, localRegistry } from '../../src/server/access/trial-registry/local';
import { proposeTrial } from '../../src/server/access/trial-registry/types';

test('independent handles preserve one immutable decision across retries and reopening', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'alfa-trials-'));
  try {
    const file = join(dir, 'trial.db');
    const namespace = randomUUID();
    const subject = 'a'.repeat(64);
    const proposed = proposeTrial(subject, new Date('2026-11-01T10:00:00Z'));
    expect(await localRegistry(file, namespace).lookup(subject)).toEqual({ status: 'unknown' });
    initializeLocalRegistry(file, namespace);
    const first = localRegistry(file, namespace);
    const second = localRegistry(file, namespace);
    expect(await first.lookup(subject)).toEqual({ status: 'absent' });
    const results = await Promise.all([
      first.createIfAbsent(subject, proposed),
      second.createIfAbsent(subject, proposeTrial(subject, new Date('2026-11-02T10:00:00Z'))),
    ]);
    expect(results).toEqual(Array(2).fill({ status: 'found', decision: proposed }));
    expect(await localRegistry(file, namespace).lookup(subject)).toEqual(results[0]);
    expect(await localRegistry(file, randomUUID()).lookup(subject)).toEqual({ status: 'unknown' });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('separate processes contend for the same durable subject', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'alfa-trials-process-'));
  try {
    const file = join(dir, 'trial.db');
    const namespace = randomUUID();
    const subject = 'b'.repeat(64);
    initializeLocalRegistry(file, namespace);
    const worker = `
      import { localRegistry } from './src/server/access/trial-registry/local.ts';
      import { proposeTrial } from './src/server/access/trial-registry/types.ts';
      const [file, namespace, subject, date] = process.argv.slice(1);
      const result = await localRegistry(file, namespace).createIfAbsent(subject, proposeTrial(subject, new Date(date)));
      console.log(JSON.stringify(result));
    `;
    const run = promisify(execFile);
    const results = await Promise.all(['2026-11-01T10:00:00Z', '2026-11-02T10:00:00Z'].map(async date => {
      const { stdout } = await run(process.execPath, [
        '--import', 'tsx', '--input-type=module', '--eval', worker, file, namespace, subject, date,
      ]);
      return JSON.parse(stdout);
    }));
    expect(results[0]).toMatchObject({ status: 'found' });
    expect(results[1]).toEqual(results[0]);
    expect(await localRegistry(file, namespace).lookup(subject)).toEqual(results[0]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('a changed key or reference cannot treat the original namespace as empty', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'alfa-trials-key-'));
  try {
    const file = join(dir, 'trial.db');
    const key = 'ec'.repeat(32);
    const identity = trialIdentity('tenant', 'v1', key)!;
    initializeLocalRegistry(file, identity.registryNamespace);
    const subject = identity.subjectId('canonical@example.invalid');
    const registered = await localRegistry(file, identity.registryNamespace)
      .createIfAbsent(subject, proposeTrial(subject, new Date('2026-11-01T10:00:00Z')));
    expect(registered.status).toBe('found');
    expect(identity.subjectId('CANONICAL@example.invalid')).toBe(subject);
    for (const changed of [trialIdentity('tenant', 'v2', key)!, trialIdentity('tenant', 'v1', 'ff'.repeat(32))!]) {
      expect(await localRegistry(file, changed.registryNamespace).lookup(changed.subjectId('canonical@example.invalid')))
        .toEqual({ status: 'unknown' });
    }
    expect(trialIdentity('tenant', 'v1')).toBeNull();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
