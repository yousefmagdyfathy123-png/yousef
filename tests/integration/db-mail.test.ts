import { expect, test } from 'vitest';
import { Pool } from 'pg';
import { migrate } from '../../tools/db/migrate';
import { createLocalMailTransport } from '../../src/server/mail/local';

test('migrations are repeatable and committed rows are visible across connections', async () => {
  const connectionString = process.env.ALFADATA_TEST_DATABASE_URL;
  if (!connectionString) throw new Error('Run via npm run test:integration');
  const writer = new Pool({ connectionString });
  const reader = new Pool({ connectionString });
  try {
    await Promise.all([migrate(writer), migrate(reader)]);
    const tables = await reader.query("select tablename from pg_tables where schemaname = 'public'");
    expect(tables.rows.map(row => row.tablename)).toEqual(expect.arrayContaining([
      'user', 'session', 'account', 'verification', 'account_access', 'preferences',
      'user_roles', 'audit_events', 'quotes', 'orders', 'provider_events', 'entitlement_grants',
    ]));
    await writer.query('insert into "user" (id, name, email, "emailVerified") values ($1, $2, $3, false)',
      ['task13-user', 'Test', 'test@example.invalid']);
    await writer.query("insert into account_access (user_id) values ('task13-user')");
    expect((await reader.query("select suspended from account_access where user_id = 'task13-user'")).rows)
      .toEqual([{ suspended: false }]);
    expect((await reader.query('select count(*)::int as count from schema_migrations')).rows[0].count)
      .toBeGreaterThanOrEqual(3);
    await expect(writer.query("insert into account_access (user_id) values ('missing-user')"))
      .rejects.toMatchObject({ code: '23503' });
  } finally {
    await Promise.all([writer.end(), reader.end()]);
  }
});

test('local mail captures deliveries and cannot be constructed in production', async () => {
  const mail = createLocalMailTransport('test');
  const message = { to: 'test@example.invalid', subject: 'Confirm', text: 'Local delivery' };
  await mail.send(message);
  expect(mail.messages).toEqual([message]);
  expect(() => createLocalMailTransport('production')).toThrow();
});
