# Private catalog

Task2 imports the pinned Database corpus without changing original files. Run:

```powershell
$env:LEGACY_CULTURE = 'en-US'
npm run catalog:build -- --source ../Database
npm run test -- tests/legacy/catalog.test.ts tests/legacy/reference.test.ts
```

Output is generated under `private/catalog`, ignored by Git and absent from public browser assets. The manifest accounts for all **1634 files / 41,852,002 bytes**: 935 tables, 245 template sources, 156 image derivatives, five engineering text files and 293 artifacts not selected for copying. A source inventory entry is not a claim that a route requires that file. Unselected settings, backups, workbooks and vendor documents retain path/hash/size and an explicit reason; no licensing/account material is copied into the catalog.

`evidence/catalog-source-manifest.json` pins original identities, independent audit row counts and descriptive header metadata. Changes in source content, count, missing/extra files or case-colliding names stop the import before a new manifest is published. Generated namespaces bind source policy and parser version; generated objects and the final manifest have their own SHA256. Publication replaces the manifest atomically. There is no cross-catalog global cache, guessed filename alias or deduplication. Original duplicates remain distinct assets.

`parseTable(bytes,id)` preserves physical rows and every comma-delimited token, including empty strings, quoted text, N/A and `0+1/2`. Rows and cells keep their original coordinates: table.rows[0][0] is physical source row1/column1; the later legacy bank uses original 1-based indices. Metadata/count/header rows are retained. A terminal newline adds no phantom row, while a real blank line remains a row. Width/count/NUL issues are classified without repairing data or inventing engineering results. Seven files have quoted count markers and one has `2 4`; all eight remain lexical source data. Lookup tables have separate descriptive layout classification.

The source uses default .NET StreamReader encoding. Three audited Windows-1252 candidates actually produce U+FFFD at physical row13/column12 under the Framework library; that observed result is preserved. The bytes retain their original source hash. Audit encoding labels are descriptive, not an instruction to guess a different decoder. The independent Framework helper and selected original-cell fixtures are committed as reference metadata. Complete lexical fingerprints cover **all 935 tables** with a documented length-prefixed UTF8 grammar, without committing the whole table data.

The exact raw DXF remains server-private for the parser in task5. At this boundary `catalog.template(id)` deliberately reports that parsing is pending rather than returning fabricated records; task5 will connect its source-derived parser. `catalog.asset(id)` provides private exact bytes to that parser. `catalog.table(id)` resolves only the original relative filename (case-insensitive as in the original Windows filesystem), validates generated content and returns frozen tables. The manifest and catalog handle are frozen too.

PNG derivatives retain the original IHDR/PLTE/tRNS/IDAT/IEND chunks byte for byte. The observed corpus contains only these plus tEXt/tIME/pHYs; those metadata chunks are removed. Signature, lengths and CRC are checked. Unexpected chunks stop conversion for evidence review. All derivatives remain private; this task creates no public download endpoint.

`src/server/catalog.ts` imports `server-only`. The unit test's narrowly scoped mock permits server-side testing; `tools/catalog/check-server-boundary.ts` separately creates an exclusive temporary Client Component, proves the real Next compiler rejects that import, and removes only its owned probe file/directory. Run with `npx tsx tools/catalog/check-server-boundary.ts`, then `npm run build` to restore a verified normal build.

Reference fixture helpers preserve exact state, trace, buffers, text and drawing commands without JSON loss, sorting or rounding. Their schema requires explicit culture, pinned source references and expected values. These data tests do not certify any route's final engineering behavior; the 495 functional cards stay pending.

References: [Framework StreamReader constructor](https://learn.microsoft.com/en-us/dotnet/api/system.io.streamreader.-ctor?view=netframework-4.8.1), [Microsoft reference source](https://github.com/microsoft/referencesource/blob/main/mscorlib/system/io/streamreader.cs), [Next server-only boundary](https://nextjs.org/docs/app/getting-started/server-and-client-components#preventing-environment-poisoning).
