import 'server-only';
import type { Catalog } from '../legacy/contracts';
import type { CatalogManifest } from '../legacy/catalog/types';
import type { RawTable } from '../legacy/contracts';
import { readFile, realpath } from 'node:fs/promises';
import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { PARSER_VERSION, safeId, sha256, manifestRevision, within } from '../legacy/catalog/integrity';
import { parseLegacyDrawing } from '../legacy/drawing/parse';
import type { LegacyTemplate } from '../legacy/contracts';
export interface LoadedCatalog extends Catalog { manifest: CatalogManifest; asset(id: string): Uint8Array }
function freezeJson(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  for (const child of Object.values(value)) freezeJson(child);
  Object.freeze(value);
}
export async function loadCatalog(root: string): Promise<LoadedCatalog> {
  const base = await realpath(root);
  const manifest: CatalogManifest = JSON.parse(await readFile(join(base,'manifest.json'),'utf8'));
  const { revision, ...body } = manifest;
  if (manifest.schemaVersion !== 1 || manifest.parserVersion !== PARSER_VERSION || !Array.isArray(manifest.files) || manifest.sourceFileCount !== manifest.files.length || revision !== manifestRevision(body)) throw new Error('Catalog integrity: manifest mismatch');
  const entries = new Map<string, CatalogManifest['files'][number]>();
  for (const entry of manifest.files) {
    const key = safeId(entry.id).toLowerCase();
    if (entries.has(key) || !/^[a-f0-9]{64}$/.test(entry.sourceHash)) throw new Error('Catalog integrity: asset identity');
    if (entry.output) safeId(entry.output);
    entries.set(key,entry);
  }
  freezeJson(manifest);
  const find = (id: string) => {
    const entry = entries.get(safeId(id).toLowerCase());
    if (!entry || !entry.output || !entry.outputHash) throw new Error('Unknown catalog asset');
    return entry;
  };
  const asset = (id: string): Uint8Array => {
    const entry = find(id);
    const file = realpathSync(join(base,entry.output!));
    if (!within(base,file)) throw new Error('Catalog integrity: asset path');
    const bytes = readFileSync(file);
    if (sha256(bytes) !== entry.outputHash) throw new Error('Catalog integrity: asset hash');
    return bytes;
  };
  const tables = new Map<string,RawTable>();
  return Object.freeze({
    revision, manifest, asset,
    table(id: string): RawTable {
      const entry = find(id);
      if (entry.kind !== 'table') throw new Error('Catalog asset is not a table');
      const cached = tables.get(entry.id); if (cached) return cached;
      const table: RawTable = JSON.parse(Buffer.from(asset(id)).toString('utf8'));
      if (table.id !== entry.id || table.sourceHash !== entry.sourceHash || !Array.isArray(table.rows) || table.rows.some(row => !Array.isArray(row) || row.some(cell => typeof cell !== 'string'))) throw new Error('Catalog integrity: table payload');
      table.rows.forEach(row => Object.freeze(row));
      Object.freeze(table.rows); Object.freeze(table); tables.set(entry.id,table);
      return table;
    },
    template(id: string): LegacyTemplate {
      const entry = find(id);
      if (entry.kind !== 'template-source') throw new Error('Catalog asset is not a template source');
      const bytes=asset(id),records=parseLegacyDrawing(bytes,{activeDba:{},lineMem:{}}).records;
      for(const record of records){record.sourceId=entry.id;for(const ref of record.sourceRefs)ref.path=entry.id;}
      const template={id:entry.id,sourceHash:entry.sourceHash,records,sourceBytes:Array.from(bytes)};freezeJson(template);return template;
    },
  });
}
