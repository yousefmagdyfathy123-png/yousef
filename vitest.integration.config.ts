import { defineConfig } from 'vitest/config';
import { requireLegacyCulture } from './src/server/legacy-culture.ts';

requireLegacyCulture(process.env);
export default defineConfig({
  test: { environment: 'node', include: ['tests/integration/**/*.test.ts'], maxWorkers: 1 },
});
