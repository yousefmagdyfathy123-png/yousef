import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
import type { CatalogManifest } from './types';
export const PARSER_VERSION = 'lexical-streamreader-v1';
export const sha256 = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');
export function safeId(id: string): string {
  if (typeof id !== 'string' || !id || id.includes('\\') || id.includes(':') || id.includes('\0') || id.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('Invalid catalog asset id');
  return id;
}
export function within(root: string, path: string): boolean {
  const rel = relative(resolve(root), resolve(path));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}
export function manifestRevision(manifest: Omit<CatalogManifest, 'revision'>): string {
  return sha256(JSON.stringify(manifest));
}
