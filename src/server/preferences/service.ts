import type { Pool } from 'pg';
import type { Principal } from '../auth/principal';
import { parsePreferenceSave, startupDefaults, type PreferenceSnapshot, type StartupPreferences } from '../../shared/preference-contracts';

export class PreferenceConflict extends Error {
  override name = 'PreferenceConflict';
}

function requireEligible(principal: Principal) {
  if (!principal.emailVerified || principal.suspended) throw new Error('Preferences require an eligible account');
}

type PreferenceRow = { version: string; values: unknown };

function toSnapshot(row: PreferenceRow): PreferenceSnapshot {
  const version = Number(row.version);
  const parsed = parsePreferenceSave({ expectedVersion: version, values: row.values });
  if (parsed) return { version, values: parsed.values };
  if (version === 0) return { version, values: { ...startupDefaults } };
  throw new Error('Invalid persisted preferences');
}

export function createPreferences(database: Pool) {
  return {
    async getPreferences(principal: Principal): Promise<PreferenceSnapshot> {
      requireEligible(principal);
      const result = await database.query<PreferenceRow>(
        'SELECT version, "values" FROM preferences WHERE user_id = $1', [principal.userId],
      );
      return result.rows[0] ? toSnapshot(result.rows[0]) : { version: 0, values: { ...startupDefaults } };
    },

    async savePreferences(principal: Principal, expectedVersion: number, values: StartupPreferences): Promise<PreferenceSnapshot> {
      requireEligible(principal);
      const input = parsePreferenceSave({ expectedVersion, values });
      if (!input) throw new TypeError('Invalid preferences');
      if (expectedVersion === Number.MAX_SAFE_INTEGER) throw new PreferenceConflict();
      const result = expectedVersion === 0
        ? await database.query<PreferenceRow>(
          `INSERT INTO preferences(user_id, version, "values") VALUES ($1, 1, $2)
           ON CONFLICT (user_id) DO UPDATE SET version = 1, "values" = EXCLUDED."values"
           WHERE preferences.version = 0 RETURNING version, "values"`, [principal.userId, input.values],
        )
        : await database.query<PreferenceRow>(
          `UPDATE preferences SET version = version + 1, "values" = $2
           WHERE user_id = $1 AND version = $3 RETURNING version, "values"`, [principal.userId, input.values, expectedVersion],
        );
      if (!result.rows[0]) throw new PreferenceConflict();
      return toSnapshot(result.rows[0]);
    },
  };
}

export async function getPreferences(principal: Principal): Promise<PreferenceSnapshot> {
  return createPreferences((await import('../db/pool')).db).getPreferences(principal);
}

export async function savePreferences(principal: Principal, expectedVersion: number, values: StartupPreferences): Promise<PreferenceSnapshot> {
  return createPreferences((await import('../db/pool')).db).savePreferences(principal, expectedVersion, values);
}
