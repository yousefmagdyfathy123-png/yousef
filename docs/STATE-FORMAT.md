# Private WorkState format

This codec is private server persistence, independent of public response projection. It never executes original code. Codec version 1 and state schema versions 1/2 are distinct version numbers; engine and catalog identities belong to the later persistence envelope, not these codec versions. No implicit fallback exists. Callers must retain the stored payload when decoding fails; the codec never mutates it or resets a workspace.

The JSON envelope has exactly `codecVersion: 1`, `stateSchemaVersion: 1 | 2`, and `state: Node`. Every node is an exact-length tuple:

| Node | Meaning |
| --- | --- |
| `["string", text]` | Literal string, even if text looks like another tag |
| `["boolean", boolean]` | Boolean |
| `["number", text]` | Canonical ECMAScript round-trip finite double text, or `NaN`, `+Infinity`, `-Infinity`, `-0` |
| `["null"]` | Present null |
| `["undefined"]` | Structural grammar only; no schema1 field admits this value |
| `["object", [[key, Node], ...]]` | Object with unique string keys |
| `["array", length, [[index, Node], ...]]` | Sparse array with explicit length and unique present indices |

No arbitrary object is interpreted as a tag. JSON tuple arrays must be dense and have no extra properties. Object keys `__proto__`, `constructor`, `prototype` are rejected everywhere; indices are nonnegative safe integers within length. Number spellings must match canonical text exactly; overflow, alternate spellings and accidental nullification of nonfinite numbers fail. Decoding allocates sparse arrays by length without filling holes. Cycles, getters/setters, symbol/nonenumerable data properties and nonplain runtime objects fail with the sanitized `Invalid private work state` error. Envelope fields are exact; reject duplicate JSON object keys at the JSON ingestion boundary if accepting raw JSON text (this API accepts already parsed unknown data). Node object fields use pairs so duplicates remain detectable after parsing.

Schema1 covers the current WorkState contract: exact root/culture/history/buffer fields; explicit en-US; nonempty route id; dense nonempty string history with a valid nonnegative cursor; nonnegative safe revision; string/number/boolean scalar values (including special numeric values). `values` contains no objects/null/undefined. Source-backed nullable string cells are distinct from sparse absence. No cell admits JavaScript undefined: CLR strings initialize to null. Existing scalar numeric values admit all doubles, but route-specific values and action continuation remain task4/5 responsibilities; codec representability never establishes route validity.

Source bounds are `ActiveDba[6,1001,1001]` and `lineMem[10001,11]` (Module1 reconstructed lines990 and962). Either numeric-key records or sparse arrays can represent each buffer dimension. Out-of-bounds indices/lengths are rejected. History remains dense and ordered; drawing/history commands are never sorted or rounded. Task4/5 must refine schema/continuation fixtures from their source investigation; task19b owns PostgreSQL persistence and restore continuation. This task does not claim those later checks.

Tests start from manually authored `tests/reference/state-codec/special-sparse.json`, verify `Object.is(-0)`, all special numbers, exact precision, null/empty/hole distinctions and present indices before encode, and exercise actual JSON storage. The generic undefined tag is rejected by schema1, rather than silently admitted merely because the grammar can encode it.

Task4 adds schema2 with one required `legacySession` object containing exactly `settings` and `lastView`. Settings use only source-established family store names (`Settings` for the default/shared store) and source-established persisted field names/types. Subtabs share the same family settings. `lastView` is null before first real route rendering; otherwise its complete private view/control/option/layout/source-reference/display-list shape is validated recursively. Unknown fields and malformed nested shapes fail. Display numbers must be finite; allowed nonfinite scalar state/settings values retain their tagged representation. Schema2 history has at most ten unique ordered ids with a valid cursor, as independently traced from Clicker/SaveTablist. Codec1/schema1 accepts only the old root without a session; a mismatched envelope/schema fails.

`upgradeWorkStateV1(payload, suppliedSession)` is the sole explicit schema1→2 migration. It validates the old payload, requires caller-supplied settings and retained view (or an explicitly supplied null), validates the new shape and returns a fresh decoded state. It never guesses a previous drawing, fabricates settings or applies account defaults. A schema1 state remains readable but cannot enter task4 transitions until explicitly migrated. The independent old wire fixture and manually authored `tests/reference/state/continuation.json` verify migration, special-value/sparse preservation and subsequent transitions. Task5 must extend schema coverage for newly established drawing buffers/commands before its acceptance; task19b must verify actual database continuation.

Task5 adds schema3 when `legacyBuffers.drawing` is present. It contains exactly
`lineVar2`, `c`, `colr`, `linetype`, `sc`, `lc` and `factor`. Tokens retain original
0..200000 indices and nullable string/hole distinctions; lineMem keeps its existing
bounds. Counters admit their one-past allocated values for partial failure state;
factor must be finite and counters nonnegative safe integers. All unknown fields
and version/shape mismatches fail. CodecVersion stays1; old schema1/2 payloads are
still readable. They have no prior drawing-token state, so first drawing parse
explicitly initializes CLR-default scratch state and produces schema3. There is
no invented reconstruction of missing old token history. Schema3 preserves whether
the previously validated session root exists; Task4 transitions still require it.
DoDrawing's far vertical text alignment is an optional strictly validated
`verticalAlign` enum on private/public text commands; omission means top.
