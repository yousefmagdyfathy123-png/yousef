import { afterAll, describe, expect, test, vi } from 'vitest';
import { mkdtemp, readFile, writeFile, mkdir, rm, symlink, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseTable, classifyTable } from '../../src/legacy/catalog/parse';
import { buildCatalog } from '../../tools/catalog/import';
import { stripPngMetadata } from '../../tools/catalog/png';
import { loadCatalog } from '../../src/server/catalog';
import type { CatalogPolicy } from '../../src/legacy/catalog/types';
import fixtures from '../reference/imported/lexical-cells.json';
import framework from '../reference/imported/framework-table-fingerprints.json';
import { assertReferenceFixture } from '../reference/schema';
// Server-side unit tests only. The real Next compiler boundary is verified separately.
vi.mock('server-only', () => ({}));
const database = resolve(process.env.LEGACY_SOURCE_ROOT ?? '..', 'Database');
const scratch: string[] = [];
afterAll(async () => {
  for (const dir of scratch) {
    if (resolve(dir) !== dir || !dir.startsWith(join(tmpdir(),'alfadata-catalog-test-'))) throw new Error('Refuse cleanup outside owned test directory');
    await rm(dir, { recursive: true, force: true });
  }
});
async function temporary() { const dir = await mkdtemp(join(tmpdir(), 'alfadata-catalog-test-')); scratch.push(dir); return dir; }
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
async function smallSource() {
  const root = await temporary(); const source = join(root, 'source'); await mkdir(join(source, 'Demo'), { recursive: true });
  const bytes = Buffer.from('3,2,3\r\n0+1/2,,N/A\r\n');
  await writeFile(join(source, 'Demo/table.csv'), bytes);
  const policy: CatalogPolicy = { schemaVersion: 1, auditInventory: { path: 'synthetic test', hash: '0'.repeat(64) }, sourceFileCount: 1, sourceBytes: bytes.length, files: [{ id: 'Demo/table.csv', kind: 'table', bytes: bytes.length, sourceHash: sha(bytes), layout: 'bank', auditHeaderRows: 1, auditRecords: 2, auditEncoding: 'ascii' }] };
  return { root, source, policy, bytes };
}
describe('source-preserving lexical tables', () => {
  for (const c of fixtures.cases) test(c.id, async () => {
    assertReferenceFixture(c);
    const raw = await readFile(join(database, c.id));
    const table = parseTable(raw, c.id);
    expect(table.sourceHash).toBe(c.expected.sourceHash);
    expect(table.rows).toHaveLength(c.expected.rows);
    expect([...new Set(table.rows.map(r => r.length))].sort((a,b) => a-b)).toEqual(c.expected.widths);
    for (const cell of c.expected.cells) expect(table.rows[cell.row-1][cell.column-1]).toBe(cell.value);
  });
  test('splits physical lines and commas without quote rules, trimming, normalization or a terminal phantom row', () => {
    const table = parseTable(Buffer.from('\ufeff3,2,3\r\n0+1/2,,N/A\r\n"a,b", x ,\r\n\r\n'), 'lexical.csv');
    expect(table.rows).toEqual([['3','2','3'], ['0+1/2','','N/A'], ['"a','b"',' x ',''], ['']]);
    expect(Object.isFrozen(table.rows[1])).toBe(true);
    expect(parseTable(new Uint8Array(), 'empty').rows).toEqual([]);
  });
  test('classifies malformed banks without silently dropping or repairing cells', () => {
    expect(classifyTable(Buffer.from('3,2,3\n1,,N/A\n')).issues).toEqual([]);
    expect(classifyTable(Buffer.from('3,2,3\n1,2\n')).issues).toContain('row-width-mismatch');
    expect(classifyTable(Buffer.from('2 4,2,3\n')).issues).toContain('invalid-count');
    expect(classifyTable(Buffer.from('0.125,6\n'), 'lookup').issues).toEqual([]);
    expect(classifyTable(new Uint8Array()).issues).toContain('empty-file');
    expect(classifyTable(Buffer.from('2,2\n\0,N/A')).issues).toContain('nul-character');
  });
  test.each(fixtures.cases.filter(c => c.id.startsWith('Ftsw/')))('retains default UTF8 replacement for $id, confirmed by Framework StreamReader', async c => {
    const bytes = await readFile(join(database, c.id));
    expect(classifyTable(bytes).invalidUtf8).toBe(true);
    expect(parseTable(bytes, c.id).rows[12][11]).toBe('\ufffd');
  });
});
describe('private immutable catalog', () => {
  test('all 935 tables match independent Framework lexical fingerprints; all 1634 source artifacts remain accounted for', async () => {
    const root=await temporary(); const out=join(root,'catalog');
    const manifest=await buildCatalog(database,out);
    expect(manifest.sourceFileCount).toBe(1634);
    expect(manifest.sourceBytes).toBe(41852002);
    const kinds=manifest.files.reduce<Record<string,number>>((all,f)=>{all[f.kind]=(all[f.kind]??0)+1;return all;},{});
    expect(kinds).toEqual({table:935,'template-source':245,'ui-image':156,text:7,'not-selected':291});
    expect(manifest.files.filter(f=>f.kind==='not-selected').every(f=>!f.output)).toBe(true);
    const catalog=await loadCatalog(out);
    expect(framework.tables).toHaveLength(935);
    for (const expected of framework.tables) {
      const table=catalog.table(expected.id);
      expect(table.sourceHash,expected.id).toBe(expected.sourceHash);
      expect(table.rows.length,expected.id).toBe(expected.rowCount);
      const chunks: Buffer[]=[];
      const uint=(n:number)=>{const b=Buffer.alloc(4);b.writeUInt32LE(n);chunks.push(b);};
      uint(table.rows.length);
      for (const row of table.rows) { uint(row.length); for (const cell of row) {const bytes=Buffer.from(cell,'utf8');uint(bytes.length);chunks.push(bytes);} }
      expect(sha(Buffer.concat(chunks)),expected.id).toBe(expected.lexicalFingerprint);
    }
    for (const file of manifest.files.filter(f=>f.kind==='template-source'||f.kind==='text')) expect(sha(catalog.asset(file.id)),file.id).toBe(file.sourceHash);
  },60000);
  test('builds deterministic manifests and loads exact case-insensitive source ids without guessed aliases', async () => {
    const { root, source, policy, bytes } = await smallSource(); const out = join(root, 'catalog');
    const manifest = await buildCatalog(source, out, { policy });
    expect(manifest.sourceFileCount).toBe(1);
    expect(manifest.files[0].sourceHash).toBe(sha(bytes));
    expect((await buildCatalog(source, out, { policy })).revision).toBe(manifest.revision);
    const catalog = await loadCatalog(out);
    expect(catalog.revision).toBe(manifest.revision);
    expect(catalog.table('demo/TABLE.csv').rows[1]).toEqual(['0+1/2', '', 'N/A']);
    expect(() => catalog.table('Demo/missing.csv')).toThrow('Unknown catalog asset');
    expect(() => catalog.table('../Demo/table.csv')).toThrow();
    expect(Object.isFrozen(catalog.table('Demo/table.csv'))).toBe(true);
    expect(Object.isFrozen(catalog.manifest.files)).toBe(true);
  });
  test('source hash changes prevent stale reuse and leave the accepted manifest intact', async () => {
    const { root, source, policy } = await smallSource(); const out = join(root, 'catalog');
    await buildCatalog(source, out, { policy });
    const accepted = await readFile(join(out, 'manifest.json'), 'utf8');
    await writeFile(join(source, 'Demo/table.csv'), '3,2,3\r\n0+3/4,,N/A\r\n');
    await expect(buildCatalog(source, out, { policy })).rejects.toThrow('Source integrity');
    expect(await readFile(join(out, 'manifest.json'), 'utf8')).toBe(accepted);
  });
  test('rejects unexpected files, output inside original source, and modified generated payloads', async () => {
    const { root, source, policy } = await smallSource(); const out = join(root, 'catalog');
    await expect(buildCatalog(source, join(source, 'generated'), { policy })).rejects.toThrow();
    await writeFile(join(source, 'extra.csv'), 'surprise');
    await expect(buildCatalog(source, out, { policy })).rejects.toThrow('Source inventory');
    await rm(join(source, 'extra.csv'));
    const manifest = await buildCatalog(source, out, { policy });
    await writeFile(join(out, manifest.files[0].output!), '{}');
    const catalog = await loadCatalog(out);
    expect(() => catalog.table('Demo/table.csv')).toThrow('Catalog integrity');
  });
  test('rejects generated-output junctions before creating directories beyond the private root', async () => {
    const { root, source, policy } = await smallSource(); const out = join(root,'catalog'); const escape=join(root,'escape');
    await mkdir(out); await mkdir(escape); await symlink(escape,join(out,'objects'),'junction');
    await expect(buildCatalog(source,out,{policy})).rejects.toThrow('symbolic link');
    expect(await readdir(escape)).toEqual([]);
  });
});
test('PNG derivatives strip text/time/resolution metadata while retaining exact rendering chunks', async () => {
  const bytes = await readFile(join(database, 'Blnu/Blnu1.png'));
  const derivative = Buffer.from(stripPngMetadata(bytes));
  const chunks = (b: Buffer) => { const result: { type: string; bytes: Buffer }[] = []; for (let i=8; i<b.length;) { const len=b.readUInt32BE(i); result.push({ type: b.toString('ascii',i+4,i+8), bytes: b.subarray(i,i+12+len) }); i+=12+len; } return result; };
  const keep = new Set(['IHDR','PLTE','tRNS','IDAT','IEND']);
  expect(chunks(derivative).map(c=>c.type)).toEqual(['IHDR','PLTE','tRNS','IDAT','IEND']);
  expect(chunks(derivative).map(c=>c.bytes)).toEqual(chunks(bytes).filter(c=>keep.has(c.type)).map(c=>c.bytes));
});
