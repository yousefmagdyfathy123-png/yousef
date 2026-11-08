These fixtures come from the independent Python analyst models, immutable
source tables and the previously audited DXF record corpus. Product TypeScript
does not generate expected outputs.

Each JSON file holds `cases` in the standard reference schema. Repeated trailing
line commands are stored once under `geometries`, keyed by SHA256 of their
canonical JSON representation. A case's `expected.view.drawing.geometryRef`
appends that literal geometry after its literal label commands. The test loader
verifies the geometry hash and expands this representation without parsing any
source DXF, formatting values, rounding, sorting, or importing production code.
This lossless factoring preserves the full paint order and avoids hundreds of
megabytes of repeated geometry. Unavailable cases have no geometry reference.

`bankFingerprint` covers every loaded/mutated source table cell, including
unselected rows and lexical values. `files` preserves load and recursive reentry
order. Cross-navigation tests separately verify retained banks and codec replay.

Pipe1's active drawing has raw wall markers; Pipe1a is an inactive alternate.
The numeric formatter's 0.065 → 0.06 / 1/16 behavior is tested independently;
Task7 does not invent a GetSubTab switch to activate the alternate drawing.
