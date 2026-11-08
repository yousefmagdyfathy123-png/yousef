import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, appendFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'node:tls';
import { createServer as createHttpsServer } from 'node:https';
import { request as requestUpstream } from 'node:http';
import { runTestProcess } from '../db/test-database';
import { trialIdentity } from '../../src/server/access/trial-identity';
import { initializeLocalRegistry, localRegistry } from '../../src/server/access/trial-registry/local';

const directory = process.env.ALFADATA_AUTH_TEST_DIR;
if (!directory || process.env.NODE_ENV === 'production') throw new Error('Use the auth Playwright config');
const gitOpenSsl = 'C:/Program Files/Git/usr/bin/openssl.exe';
const openssl = process.env.ALFADATA_TEST_OPENSSL ?? (existsSync(gitOpenSsl) ? gitOpenSsl : 'openssl');
const certificate = join(directory, 'smtp.pem');
const key = join(directory, 'smtp-key.pem');
execFileSync(openssl, [
  'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost',
  '-addext', 'subjectAltName=IP:127.0.0.1', '-out', certificate, '-keyout', key,
], { stdio: 'ignore' });

const tls = { key: readFileSync(key), cert: readFileSync(certificate) };
const smtp = createServer(tls, socket => {
  let buffer = '';
  let message: string[] | null = null;
  let recipient = '';
  socket.setEncoding('utf8');
  socket.write('220 localhost ESMTP\r\n');
  socket.on('error', () => socket.destroy());
  socket.on('data', chunk => {
    buffer += chunk;
    let end = buffer.indexOf('\r\n');
    while (end !== -1) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      if (message !== null) {
        if (line === '.') {
          const text = message.join('\n').replace(/=\n/g, '').replace(/=3D/g, '=');
          appendFileSync(join(directory, 'mail.jsonl'), JSON.stringify({ recipient, text }) + '\n');
          message = null;
          socket.write('250 Queued\r\n');
        } else message.push(line);
      } else if (/^(EHLO|HELO) /i.test(line)) socket.write('250 localhost\r\n');
      else if (/^MAIL FROM:/i.test(line)) socket.write('250 OK\r\n');
      else if (/^RCPT TO:/i.test(line)) {
        recipient = line.match(/<([^>]+)>/)?.[1] ?? '';
        socket.write('250 OK\r\n');
      } else if (line === 'DATA') {
        message = [];
        socket.write('354 End with a dot\r\n');
      } else if (line === 'QUIT') socket.end('221 Bye\r\n');
      else socket.write('500 Unknown command\r\n');
      end = buffer.indexOf('\r\n');
    }
  });
});

await new Promise<void>((resolve, reject) => {
  smtp.once('error', reject);
  smtp.listen(0, '127.0.0.1', resolve);
});
const address = smtp.address();
if (!address || typeof address === 'string') throw new Error('SMTP fixture failed to bind');
const databaseUrl = process.env.ALFADATA_TEST_DATABASE_URL;
if (!databaseUrl || !/^\/alfadata_test_[a-f0-9]{32}$/.test(new URL(databaseUrl).pathname)) {
  smtp.close();
  throw new Error('Use the isolated auth browser test runner');
}
const trialKey = randomBytes(32).toString('hex');
const trialToken = randomBytes(32).toString('hex');
const trialNamespace = trialIdentity('browser-fixture', 'v1', trialKey)!.registryNamespace;
const trialFile = join(directory, 'trial.db');
initializeLocalRegistry(trialFile, trialNamespace);
const trialRegistry = localRegistry(trialFile, trialNamespace);

try {
  const https = createHttpsServer(tls, async (request, response) => {
    if (request.url === '/_test/trial-registry') {
      if (request.method !== 'POST' || request.headers.authorization !== 'Bearer ' + trialToken) {
        response.writeHead(403).end();
        return;
      }
      try {
        let body = '';
        for await (const chunk of request) {
          body += chunk;
          if (body.length > 4096) throw new Error('Invalid registry request');
        }
        const { operation, namespace, subjectId, proposed } = JSON.parse(body);
        if (namespace !== trialNamespace || !/^[a-f0-9]{64}$/.test(subjectId)) {
          response.writeHead(400).end();
          return;
        }
        const result = operation === 'lookup' ? await trialRegistry.lookup(subjectId)
          : operation === 'createIfAbsent' && proposed ? await trialRegistry.createIfAbsent(subjectId, proposed)
          : { status: 'unknown' };
        response.writeHead(200, { 'content-type': 'application/json' })
          .end(JSON.stringify({ namespace: trialNamespace, ...result }));
      } catch {
        response.writeHead(400).end();
      }
      return;
    }
    const upstream = requestUpstream({
      hostname: '127.0.0.1', port: 3188, method: request.method, path: request.url,
      headers: { ...request.headers, 'x-forwarded-proto': 'https' },
    }, result => {
      response.writeHead(result.statusCode ?? 502, result.headers);
      result.pipe(response);
    });
    upstream.on('error', () => {
      response.writeHead(503);
      response.end();
    });
    request.pipe(upstream);
  });
  await new Promise<void>((resolve, reject) => {
    https.once('error', reject);
    https.listen(3187, '127.0.0.1', resolve);
  });
  try {
    const nextEnv: NodeJS.ProcessEnv = {
      ...process.env, DATABASE_URL: databaseUrl, LEGACY_CULTURE: 'en-US',
      BETTER_AUTH_URL: 'https://127.0.0.1:3187', BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
      SMTP_URL: 'smtps://127.0.0.1:' + address.port, SMTP_FROM: 'Alfadata <test@example.invalid>',
      NODE_EXTRA_CA_CERTS: certificate,
      TRIAL_REGISTRY_URL: 'https://127.0.0.1:3187/_test/trial-registry', TRIAL_REGISTRY_TOKEN: trialToken,
      TRIAL_REGISTRY_NAMESPACE: 'browser-fixture', TRIAL_IDENTITY_KEY_REF: 'v1', TRIAL_IDENTITY_KEY_HEX: trialKey,
      TRIAL_MIRROR_EPOCH: 'browser-fixture',
      PURCHASE_POLICY_VERSION: 'browser-fixture-v1',
      PURCHASE_POLICY_TEXT: 'Synthetic browser-test purchase policy.',
      DELETION_BUSINESS_CALENDAR: JSON.stringify({
        timeZone: 'UTC', policyText: 'Synthetic browser-test calendar and deletion policy.',
        businessDates: Array.from({ length: 30 }, (_, index) =>
          new Date(Date.now() + (index - 3) * 86400000).toISOString().slice(0, 10)),
      }),
    };
    const args = ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3188'];
    const restartFile = process.env.ALFADATA_PERF_RESTART_FILE;
    const memoryFile = process.env.ALFADATA_PERF_MEMORY_FILE;
    if (memoryFile) {
      const preload = new URL('../performance/server-memory.mjs', import.meta.url);
      nextEnv.NODE_OPTIONS = [process.env.NODE_OPTIONS, '--import=' + preload.href].filter(Boolean).join(' ');
    }
    const controller = new AbortController();
    const watch = restartFile ? setInterval(() => {
      if (!existsSync(restartFile)) return;
      unlinkSync(restartFile);
      controller.abort();
    }, 100) : undefined;
    try {
      process.exitCode = await runTestProcess(args, nextEnv, controller.signal);
    } finally {
      clearInterval(watch);
    }
    if (controller.signal.aborted) process.exitCode = await runTestProcess(args, nextEnv);
  } finally {
    https.close();
  }
} finally {
  smtp.close();
}
