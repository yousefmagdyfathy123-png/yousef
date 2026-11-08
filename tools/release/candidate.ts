import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadCatalog } from '../../src/server/catalog';
import sourceCatalog from '../../evidence/catalog-source-manifest.json';
import type { CandidateIdentity } from './contracts';

const hash = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');

export async function releaseCandidate(config: { culture: string; profile: string }): Promise<CandidateIdentity> {
  const paths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' });
  const files = [...new Set(paths.split('\0'))]
    .filter(path => path && path !== 'AGENTS.md' && !path.startsWith('evidence/acceptance/') &&
      !(config.profile === 'local-performance' && /^evidence\/performance\/(baseline|budgets|load-report|receipt-window)\.json$/.test(path))).sort();
  const entries = files.map(path => [path, hash(readFileSync(path))]);
  const catalog = await loadCatalog(resolve('private/catalog'));
  if (catalog.manifest.sourceInventoryHash !== hash(JSON.stringify(sourceCatalog))) {
    throw new Error('Catalog does not identify the pinned source inventory');
  }
  for (const file of catalog.manifest.files) if (file.output) catalog.asset(file.id);
  return {
    sourceTreeHash: hash(JSON.stringify(entries)),
    catalogRevision: catalog.revision,
    configFingerprint: hash(JSON.stringify(config)),
  };
}
