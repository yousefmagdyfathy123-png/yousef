import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { releaseCandidate } from '../release/candidate';

export async function runPerformanceScenario(spec: string, output: string) {
  const profile = 'local-performance';
  const culture = 'en-US';
  const candidate = await releaseCandidate({ culture, profile });
  const scratch = resolve('.local/performance');
  mkdirSync(scratch, { recursive: true });
  const directory = mkdtempSync(resolve(scratch, output + '-'));
  const path = resolve(directory, 'samples.json');
  const memoryPath = resolve(directory, 'server-memory.jsonl');
  const env = { ...process.env, LEGACY_CULTURE: culture, ALFADATA_PERF_SAMPLE_FILE: path,
    ALFADATA_PERF_MEMORY_FILE: memoryPath, ALFADATA_PERF_RESTART_FILE: resolve(directory, 'restart') };
  delete (env as NodeJS.ProcessEnv).DATABASE_URL;
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'tools/auth/test-browser.ts', spec], {
    stdio: 'inherit', env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Protected performance scenario failed: ' + spec);
  const current = await releaseCandidate({ culture, profile });
  if (JSON.stringify(candidate) !== JSON.stringify(current)) throw new Error('Candidate changed during performance measurement');
  const samples = JSON.parse(readFileSync(path, 'utf8'));
  const serverMemory = readFileSync(memoryPath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  writeFileSync('evidence/performance/' + output + '.json', JSON.stringify({ candidate, ...samples, serverMemory }, null, 2) + '\n');
}
