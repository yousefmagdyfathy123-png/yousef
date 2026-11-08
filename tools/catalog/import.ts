import { mkdir, readdir, readFile, writeFile, rename, lstat, realpath } from 'node:fs/promises';
import { resolve, join, dirname, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CatalogAsset, CatalogManifest, CatalogPolicy } from '../../src/legacy/catalog/types';
import { parseTable, classifyTable } from '../../src/legacy/catalog/parse';
import { PARSER_VERSION, safeId, sha256, within, manifestRevision } from '../../src/legacy/catalog/integrity';
import defaultPolicy from '../../evidence/catalog-source-manifest.json';
import { stripPngMetadata } from './png';
async function listFiles(root: string, prefix = ''): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const id = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error('Source inventory contains a symbolic link');
    if (entry.isDirectory()) found.push(...await listFiles(join(root,entry.name), id+'/'));
    else if (entry.isFile()) found.push(safeId(id));
    else throw new Error('Source inventory contains an unsupported entry');
  }
  return found.sort();
}
async function ensurePrivateOutput(source: string, out: string) {
  // Resolve existing parents before creating anything: junctions cannot redirect
  // a private output into the immutable source or an app public directory.
  let ancestor = out; const suffix: string[] = [];
  while (true) {
    try { const actual = await realpath(ancestor); out = resolve(actual,...suffix); break; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || dirname(ancestor) === ancestor) throw error; suffix.unshift(basename(ancestor)); ancestor = dirname(ancestor); }
  }
  if (within(source,out) || within(out,source) || [resolve('public'),resolve('out'),resolve('.next'),resolve('src')].some(publicRoot => within(publicRoot,out))) throw new Error('Catalog output must be private and outside original source');
  return out;
}
async function writeImmutable(root: string, path: string, bytes: Uint8Array) {
  const output = join(root,safeId(path));
  // Check each parent before creating descendants, including Windows junctions.
  let part = root;
  for (const segment of path.split('/').slice(0,-1)) {
    part=join(part,segment);
    try { await mkdir(part); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    const info = await lstat(part);
    if (info.isSymbolicLink()) throw new Error('Catalog output contains a symbolic link');
    if (!info.isDirectory()) throw new Error('Catalog output parent is not a directory');
  }
  try {
    await writeFile(output, bytes, { flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    if ((await lstat(output)).isSymbolicLink() || sha256(await readFile(output)) !== sha256(bytes)) throw new Error('Catalog integrity: existing generated object differs');
  }
}
export async function buildCatalog(sourceRoot: string, outRoot: string, options?: { policy: CatalogPolicy }): Promise<CatalogManifest> {
  const source = await realpath(resolve(sourceRoot));
  const out = await ensurePrivateOutput(source,resolve(outRoot));
  const policy = options?.policy ?? defaultPolicy as CatalogPolicy;
  const ids = new Set<string>();
  for (const file of policy.files) { safeId(file.id); const key=file.id.toLowerCase(); if (ids.has(key)) throw new Error('Source inventory has case-colliding ids'); ids.add(key); }
  const actual = await listFiles(source);
  if (policy.schemaVersion !== 1 || policy.sourceFileCount !== policy.files.length || JSON.stringify(actual) !== JSON.stringify(policy.files.map(f=>f.id).sort())) throw new Error('Source inventory differs from the pinned manifest');
  const original = new Map<string,Buffer>();
  let bytesTotal = 0;
  for (const file of policy.files) {
    const bytes = await readFile(join(source,file.id));
    if (bytes.length !== file.bytes || sha256(bytes) !== file.sourceHash) throw new Error(`Source integrity: ${file.id}`);
    original.set(file.id,bytes); bytesTotal += bytes.length;
  }
  if (bytesTotal !== policy.sourceBytes) throw new Error('Source inventory byte count differs');
  const sourceInventoryHash = sha256(JSON.stringify(policy));
  const namespace = `objects/${PARSER_VERSION}/${sourceInventoryHash}`;
  await mkdir(out, { recursive: true });
  const files: CatalogAsset[] = [];
  for (const file of policy.files) {
    const bytes = original.get(file.id)!; const asset: CatalogAsset = { ...file };
    if (file.kind !== 'not-selected') {
      let payload: Uint8Array = bytes;
      if (file.kind === 'table') {
        const table = parseTable(bytes,file.id);
        payload = Buffer.from(JSON.stringify(table)+'\n');
        asset.classification = classifyTable(bytes,file.layout);
        if (file.auditRecords !== undefined && table.rows.length !== file.auditRecords) throw new Error(`Source table row count differs from audit: ${file.id}`);
      } else if (file.kind === 'ui-image') payload = stripPngMetadata(bytes);
      asset.output = `${namespace}/${file.kind}/${file.id}${file.kind === 'table' ? '.json' : ''}`;
      asset.outputHash = sha256(payload);
      await writeImmutable(out,asset.output,payload);
    }
    files.push(asset);
  }
  const body: Omit<CatalogManifest,'revision'> = { schemaVersion: 1, parserVersion: PARSER_VERSION, sourceInventoryHash, sourceFileCount: files.length, sourceBytes: bytesTotal, files };
  const manifest: CatalogManifest = { ...body, revision: manifestRevision(body) };
  const temp = join(out,`manifest.${randomUUID()}.tmp`);
  await writeFile(temp,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  await rename(temp,join(out,'manifest.json'));
  return manifest;
}
