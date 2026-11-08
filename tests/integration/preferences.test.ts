import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { migrate } from '../../tools/db/migrate';
import { createPreferences } from '../../src/server/preferences/service';
import { parsePreferenceSave } from '../../src/shared/preference-contracts';

const database = new Pool({ connectionString: process.env.ALFADATA_TEST_DATABASE_URL });
beforeAll(async () => { await migrate(database); });
afterAll(() => database.end());

test('preferences start at source defaults and concurrent saves commit exactly one snapshot', async () => {
  const userId = randomUUID();
  await database.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES ($1,$1,$2,true)',
    [userId, userId + '@example.invalid']);
  const principal = { userId, sessionId: 'fixture', role: 'user' as const, emailVerified: true, suspended: false };
  const service = createPreferences(database);
  expect(await service.getPreferences(principal)).toEqual({
    version: 0, values: { units: 'Metric', listUnits: 'Inches', temperature: 'Celsius', fractions: false },
  });
  const values = { units: 'Imperial', listUnits: 'Millimetres', temperature: 'Fahrenheit', fractions: true } as const;
  for (const expectedVersion of [0, 1]) {
    const results = await Promise.allSettled([
      service.savePreferences(principal, expectedVersion, values),
      service.savePreferences(principal, expectedVersion, { ...values, fractions: false }),
    ]);
    const saved = results.filter(result => result.status === 'fulfilled');
    expect(saved).toHaveLength(1);
    expect(results.find(result => result.status === 'rejected')).toMatchObject({
      reason: { name: 'PreferenceConflict' },
    });
    expect(await service.getPreferences(principal)).toEqual(saved[0].value);
    expect(saved[0].value.version).toBe(expectedVersion + 1);
  }
  await expect(service.savePreferences({ ...principal, suspended: true }, 2, values)).rejects.toThrow();
  await expect(service.savePreferences({ ...principal, emailVerified: false }, 2, values)).rejects.toThrow();
  expect((await database.query('SELECT 1 FROM account_access WHERE user_id = $1', [userId])).rowCount).toBe(0);
  expect(parsePreferenceSave({ expectedVersion: 2, values })).toEqual({ expectedVersion: 2, values });
  expect(parsePreferenceSave({ expectedVersion: 2, values: { ...values, culture: 'en-US' } })).toBeNull();
  expect(parsePreferenceSave({ expectedVersion: 2, values, userId })).toBeNull();
  expect(parsePreferenceSave({ expectedVersion: Number.MAX_SAFE_INTEGER + 1, values })).toBeNull();
});
