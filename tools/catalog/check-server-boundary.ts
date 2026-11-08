import { mkdir, writeFile, unlink, rmdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { requireLegacyCulture } from '../../src/server/legacy-culture';
requireLegacyCulture(process.env);
const root=resolve('src/app/catalog-boundary-probe');
const page=join(root,'page.tsx');
// Exclusive creation and nonrecursive cleanup: existing user files are never replaced.
await mkdir(root);
try {
  await writeFile(page,"'use client';\nimport { loadCatalog } from '../../server/catalog';\nexport default function Probe(){return <button onClick={()=>loadCatalog('private/catalog')}>Probe</button>;}\n",{flag:'wx'});
  const result=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build'],{env:process.env,encoding:'utf8',maxBuffer:8*1024*1024});
  const output=(result.stdout??'')+(result.stderr??'');
  await mkdir('.local/task2',{recursive:true});
  await writeFile('.local/task2/server-boundary.log',output);
  if (result.error || result.status===0 || !output.includes('server-only')) throw new Error('Client import was not rejected by the expected server-only boundary; inspect .local/task2/server-boundary.log');
  console.log('PASS: Next production compiler rejected the private catalog imported by a Client Component.');
} finally {
  await unlink(page);
  await rmdir(root);
}
