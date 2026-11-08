import { afterAll, beforeAll, expect, test } from 'vitest';
import { Pool } from 'pg';
import { migrate } from '../../tools/db/migrate';
import { createLocalMailTransport } from '../../src/server/mail/local';
import { createHash } from 'node:crypto';
import type { Principal } from '../../src/server/auth/principal';
import { BrowserMutationDenied, createBrowserProtection } from '../../src/server/security/browser-mutation';

const database = new Pool({ connectionString: process.env.ALFADATA_TEST_DATABASE_URL });
const mail = createLocalMailTransport();
const origin = 'http://127.0.0.1:3186';
const email = 'task14@example.invalid';
const password = 'First long password';
let handle: (request: Request) => Promise<Response>;
let principal: (request: Request) => Promise<Principal | null>;

beforeAll(async () => {
  await migrate(database);
  const { createIdentity } = await import('../../src/server/auth/config');
  const identity = createIdentity({ database, mail, origin, secret: 'integration-secret-not-for-production-123' });
  handle = identity.handler;
  principal = identity.getPrincipal;
});
afterAll(() => database.end());

function post(path: string, body: object, cookie = '', source = origin) {
  return handle(new Request(origin + '/api/auth/' + path, {
    method: 'POST', headers: { origin: source, cookie, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

function link() {
  return mail.messages.at(-1)!.text.match(/https?:\/\/\S+/)![0];
}

test('real signup, one-use verification and recovery preserve entitlement and revoke sessions', async () => {
  expect((await post('sign-up/email', { name: 'Tester', email, password }, '', 'https://evil.invalid')).status).toBe(403);
  const signup = await post('sign-up/email', { name: 'Tester', email, password });
  expect(signup.ok).toBe(true);
  expect((await signup.json()).token).toBeNull();
  expect((await post('sign-in/email', { email, password })).status).toBe(403);

  const confirmation = link();
  const confirm = () => handle(new Request(confirmation));
  const results = await Promise.all([confirm(), confirm()]);
  expect(results.filter(result => result.headers.get('location')?.includes('status=verified'))).toHaveLength(1);
  expect((await post('sign-in/email', { email, password: 'wrong password' })).status).toBe(401);
  const signIn = await post('sign-in/email', { email, password });
  expect(signIn.ok).toBe(true);
  expect(await signIn.json()).toEqual({ status: true });
  const cookie = signIn.headers.get('set-cookie')!.split(';')[0];
  const request = new Request(origin, { headers: { cookie } });
  const account = await principal(request);
  expect(account?.emailVerified).toBe(true);
  expect((await database.query('SELECT * FROM account_access WHERE user_id = $1', [account!.userId])).rows).toEqual([]);

  const protectionOptions = { origin, secret: 'integration-secret-not-for-production-123', readPrincipal: principal };
  const guard = createBrowserProtection(protectionOptions);
  const mutation = (headers: HeadersInit) => new Request(origin + '/owned-mutation', { method: 'POST', headers });
  const csrf = await guard.issue(mutation({ cookie, origin }));
  const secondSession = await post('sign-in/email', { email, password });
  const secondCookie = secondSession.headers.get('set-cookie')!.split(';')[0];
  const otherToken = await guard.issue(mutation({ cookie: secondCookie, origin }));
  let providerCalls = 0;
  async function ownedMutation(headers: HeadersInit) {
    await guard.require(mutation(headers), account!);
    providerCalls++;
    await database.query("INSERT INTO preferences (user_id, version) VALUES ($1, 1)", [account!.userId]);
  }
  const deniedHeaders: Record<string, string>[] = [
    { cookie, origin },
    { cookie, origin, 'x-alfadata-csrf': 'x'.repeat(43) },
    { cookie, origin, 'x-alfadata-csrf': otherToken },
    { cookie, origin: 'https://sibling.example.invalid', 'x-alfadata-csrf': csrf },
    { cookie, 'x-forwarded-host': '127.0.0.1:3186', 'x-alfadata-csrf': csrf },
  ];
  for (const headers of deniedHeaders) {
    await expect(ownedMutation(headers)).rejects.toBeInstanceOf(BrowserMutationDenied);
  }
  expect(providerCalls).toBe(0);
  const counts = await database.query(
    `SELECT (SELECT count(*) FROM preferences WHERE user_id = $1) AS preferences,
            (SELECT count(*) FROM account_access WHERE user_id = $1 AND trial_started_at IS NOT NULL) AS trials,
            (SELECT count(*) FROM orders WHERE user_id = $1) AS orders,
            (SELECT count(*) FROM audit_events WHERE actor_user_id = $1 OR subject_user_id = $1) AS audit`,
    [account!.userId],
  );
  expect(counts.rows).toEqual([{ preferences: '0', trials: '0', orders: '0', audit: '0' }]);
  expect(await createBrowserProtection(protectionOptions).issue(mutation({ cookie, origin })) === csrf).toBe(true);
  await ownedMutation({ cookie, referer: origin + '/account', 'x-alfadata-csrf': csrf });
  expect(providerCalls).toBe(1);

  await database.query("INSERT INTO account_access VALUES ($1, '2026-11-01T10:00Z', '2026-11-06T10:00Z', false)", [account!.userId]);
  const recovery = await post('request-password-reset', { email, redirectTo: '/reset-password' });
  const unknown = await post('request-password-reset', { email: 'unknown@example.invalid', redirectTo: '/reset-password' });
  expect(await recovery.json()).toEqual(await unknown.json());
  const reset = await handle(new Request(link()));
  const token = new URL(reset.headers.get('location')!, origin).searchParams.get('token');
  expect(token).toBeTruthy();
  expect((await database.query('SELECT identifier FROM verification')).rows.some(row => row.identifier.includes(token))).toBe(false);
  const resetResults = await Promise.all([
    post('reset-password', { token, newPassword: 'Second long password' }),
    post('reset-password', { token, newPassword: 'Second long password' }),
  ]);
  expect(resetResults.filter(result => result.ok)).toHaveLength(1);
  expect(await principal(request)).toBeNull();
  await expect(guard.require(mutation({ cookie, origin, 'x-alfadata-csrf': csrf }), account!))
    .rejects.toBeInstanceOf(BrowserMutationDenied);
  const access = (await database.query('SELECT trial_started_at, trial_ends_at FROM account_access WHERE user_id = $1', [account!.userId])).rows[0];
  expect(access.trial_started_at.toISOString()).toBe('2026-11-01T10:00:00.000Z');
  expect(access.trial_ends_at.toISOString()).toBe('2026-11-06T10:00:00.000Z');

  const newSignIn = await post('sign-in/email', { email, password: 'Second long password' });
  const newCookie = newSignIn.headers.get('set-cookie')!.split(';')[0];
  expect((await post('sign-out', {}, newCookie)).ok).toBe(true);
  expect(await principal(new Request(origin, { headers: { cookie: newCookie } }))).toBeNull();
});

test('expired confirmation and recovery links cannot change identity', async () => {
  const expiredEmail = 'task14-expired@example.invalid';
  expect((await post('sign-up/email', { name: 'Expiry tester', email: expiredEmail, password })).ok).toBe(true);
  const confirmation = new URL(link());
  const hash = createHash('sha256').update(confirmation.searchParams.get('token')!).digest('hex');
  await database.query('UPDATE email_confirmation_links SET expires_at = now() WHERE digest = $1', [hash]);
  const expiredConfirmation = await handle(new Request(confirmation));
  expect(expiredConfirmation.headers.get('location')).toBe(origin + '/verify-email?status=invalid');
  const user = (await database.query('SELECT id, "emailVerified" FROM "user" WHERE email = $1', [expiredEmail])).rows[0];
  expect(user.emailVerified).toBe(false);

  expect((await post('request-password-reset', { email: expiredEmail })).ok).toBe(true);
  const reset = new URL(link());
  const token = reset.pathname.split('/').at(-1);
  await database.query(`UPDATE verification SET "expiresAt" = now() - interval '5 minutes' WHERE value = $1`, [user.id]);
  const expiredReset = await handle(new Request(reset));
  expect(new URL(expiredReset.headers.get('location')!, origin).searchParams.get('error')).toBe('INVALID_TOKEN');
  expect((await post('reset-password', { token, newPassword: 'A rejected password' })).status).toBe(400);
});
