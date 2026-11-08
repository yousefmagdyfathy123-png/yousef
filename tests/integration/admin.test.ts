import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { migrate } from '../../tools/db/migrate';
import { createAdministration } from '../../src/server/admin/service';

const database = new Pool({ connectionString: process.env.ALFADATA_TEST_DATABASE_URL });
beforeAll(async () => { await migrate(database); });
afterAll(() => database.end());

test('operator grants an existing account admin and suspension records the actor once', async () => {
  const actor = randomUUID(), target = randomUUID();
  for (const id of [actor, target]) {
    await database.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES ($1,$1,$2,true)', [id, id + '@example.invalid']);
  }
  const admin = createAdministration(database);
  await expect(admin.setSuspension(actor, target, true)).rejects.toThrow();
  await expect(admin.grantAdmin(randomUUID())).rejects.toThrow();
  await admin.grantAdmin(actor);
  await admin.setSuspension(actor, target, true);
  await admin.setSuspension(actor, target, true);
  expect((await database.query('SELECT suspended FROM account_access WHERE user_id=$1', [target])).rows).toEqual([{ suspended: true }]);
  expect((await database.query("SELECT actor_user_id, details FROM audit_events WHERE subject_user_id=$1 AND action='account.suspension'", [target])).rows)
    .toEqual([{ actor_user_id: actor, details: { suspended: true } }]);
  await admin.setSuspension(actor, target, false);
  expect((await database.query('SELECT suspended FROM account_access WHERE user_id=$1', [target])).rows).toEqual([{ suspended: false }]);
});
