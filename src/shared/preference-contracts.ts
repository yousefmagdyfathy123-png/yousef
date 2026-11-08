import type { UnitSystem } from '../legacy/contracts';

export type StartupPreferences = {
  units: UnitSystem;
  listUnits: 'Inches' | 'Millimetres';
  temperature: 'Celsius' | 'Fahrenheit';
  fractions: boolean;
};

export type PreferenceSnapshot = { version: number; values: StartupPreferences };

export const startupDefaults: Readonly<StartupPreferences> = Object.freeze({
  units: 'Metric', listUnits: 'Inches', temperature: 'Celsius', fractions: false,
});

export function parsePreferenceSave(input: unknown): { expectedVersion: number; values: StartupPreferences } | null {
  if (!input || typeof input !== 'object' || Object.keys(input).length !== 2) return null;
  const { expectedVersion, values } = input as Record<string, unknown>;
  if (typeof expectedVersion !== 'number' || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0 ||
      !values || typeof values !== 'object' || Object.keys(values).length !== 4) return null;
  const { units, listUnits, temperature, fractions } = values as Record<string, unknown>;
  if ((units !== 'Metric' && units !== 'Imperial') ||
      (listUnits !== 'Inches' && listUnits !== 'Millimetres') ||
      (temperature !== 'Celsius' && temperature !== 'Fahrenheit') || typeof fractions !== 'boolean') return null;
  return { expectedVersion, values: { units, listUnits, temperature, fractions } };
}
