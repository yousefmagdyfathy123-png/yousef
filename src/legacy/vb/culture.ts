import type { LegacyCulture } from '../contracts.ts';
const profile: Readonly<LegacyCulture> = Object.freeze({ name: 'en-US', decimalSeparator: '.', groupSeparator: ',' });
export function resolveLegacyCulture(env: Record<string, string | undefined>): LegacyCulture {
  if (env.LEGACY_CULTURE !== 'en-US') throw new Error('LEGACY_CULTURE must explicitly equal en-US for release1');
  return profile;
}
export function assertLegacyCulture(c: LegacyCulture): void {
  if (c.name !== profile.name || c.decimalSeparator !== '.' || c.groupSeparator !== ',') throw new Error('Unsupported legacy culture profile');
}
