import type { LegacyBuffers, LegacyCell, Catalog, TraceEvent } from '../contracts';
export function readCatalogCell(catalog:Catalog,id:string,row:number,column:number,trace:TraceEvent[]):string {
  if(!Number.isInteger(row)||!Number.isInteger(column)||row<1||column<1)throw new Error('Source selection index out of bounds');
  const value=catalog.table(id).rows[row-1]?.[column-1];
  if(value===undefined)throw new Error('Source selection index out of bounds');
  trace.push({operation:'read',sourceId:id,row,column,value});return value;
}
function bounds(bank: number, row: number, column: number): void {
  if (![bank,row,column].every(n=>Number.isInteger(n) && n >= 0) || bank > 5 || row > 1000 || column > 1000) throw new Error('Legacy buffer index out of bounds');
}
export function readCell(buffers: LegacyBuffers, bank: number, row: number, column: number): LegacyCell { bounds(bank,row,column); return buffers.activeDba[bank]?.[row]?.[column] ?? null; }
export function writeCell(buffers: LegacyBuffers, bank: number, row: number, column: number, value: LegacyCell): void {
  bounds(bank,row,column);
  if (value !== null && typeof value !== 'string') throw new Error('Invalid legacy cell');
  ((buffers.activeDba[bank] ??= {})[row] ??= {})[column]=value;
}
export function cloneBuffers(buffers: LegacyBuffers): LegacyBuffers { return structuredClone(buffers); }
