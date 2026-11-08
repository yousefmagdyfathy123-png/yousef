import { defineConfig } from 'vitest/config';
import { requireLegacyCulture } from './src/server/legacy-culture.ts';
requireLegacyCulture(process.env);
export default defineConfig({ test: { environment: 'node', include: ['tests/**/*.test.ts'], exclude: ['tests/integration/**'], maxWorkers: 2 } });
