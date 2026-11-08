import type { RawTable } from '../contracts';
import type { TableClassification } from './types';
import { sha256 } from './integrity';
export function decodeSource(bytes: Uint8Array): { text: string; encoding: string; invalidUtf8: boolean } {
  let encoding = 'utf-8';
  if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = 'utf-16le';
  if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = 'utf-16be';
  if ((bytes[0] === 0xff && bytes[1] === 0xfe && bytes[2] === 0 && bytes[3] === 0) || (bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 0xfe && bytes[3] === 0xff)) {
    const little = bytes[0] === 0xff; let text = '';
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 4; i < bytes.length; i += 4) {
      const code = i + 4 <= bytes.length ? view.getUint32(i, little) : 0xffffffff;
      text += code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '\ufffd';
    }
    return { text, encoding: little ? 'utf-32le' : 'utf-32be', invalidUtf8: false };
  }
  let invalidUtf8 = false;
  if (encoding === 'utf-8') {
    try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { invalidUtf8 = true; }
  }
  return { text: new TextDecoder(encoding).decode(bytes), encoding, invalidUtf8 };
}
export function sourceLines(bytes: Uint8Array): string[] {
  const { text } = decodeSource(bytes);
  if (!text.length) return [];
  const lines = text.split(/\r\n|\r|\n/);
  if (lines[lines.length-1] === '') lines.pop();
  return lines;
}
export function parseTable(bytes: Uint8Array, id: string): RawTable {
  const rows = Object.freeze(sourceLines(bytes).map(line => Object.freeze(line.split(','))));
  return Object.freeze({ id, sourceHash: sha256(bytes), rows });
}
export function classifyTable(bytes: Uint8Array, layout: 'bank' | 'lookup' | 'unresolved' = 'bank'): TableClassification {
  const decoded = decodeSource(bytes);
  const rows = sourceLines(bytes).map(line => line.split(','));
  const first = rows[0]?.[0].trim() ?? '';
  const count = /^\d+$/.test(first) && Number.isSafeInteger(Number(first)) && Number(first) > 0 ? Number(first) : null;
  const issues: TableClassification['issues'] = [];
  if (!rows.length) issues.push('empty-file');
  if (layout !== 'lookup' && count === null) issues.push('invalid-count');
  if (layout !== 'lookup' && count !== null && rows.some(r => r.length !== count)) issues.push('row-width-mismatch');
  if (decoded.text.includes('\0')) issues.push('nul-character');
  return { encoding: decoded.encoding, invalidUtf8: decoded.invalidUtf8, declaredColumns: layout === 'lookup' ? null : count, rowWidths: [...new Set(rows.map(r => r.length))].sort((a,b) => a-b), issues };
}
