export type AssetKind = 'table' | 'template-source' | 'ui-image' | 'text' | 'not-selected';
export type SourceAsset = { id: string; bytes: number; sourceHash: string; kind: AssetKind; layout?: 'bank' | 'lookup' | 'unresolved'; auditHeaderRows?: number; auditRecords?: number; auditEncoding?: string; reason?: string };
export type CatalogPolicy = { schemaVersion: 1; auditInventory: { path: string; hash: string }; sourceFileCount: number; sourceBytes: number; files: SourceAsset[] };
export type TableClassification = { encoding: string; invalidUtf8: boolean; declaredColumns: number | null; rowWidths: number[]; issues: ('empty-file' | 'invalid-count' | 'row-width-mismatch' | 'nul-character')[] };
export type CatalogAsset = SourceAsset & { output?: string; outputHash?: string; classification?: TableClassification };
export type CatalogManifest = { schemaVersion: 1; parserVersion: string; revision: string; sourceInventoryHash: string; sourceFileCount: number; sourceBytes: number; files: CatalogAsset[] };
