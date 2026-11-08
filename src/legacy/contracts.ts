import type { SourceRef } from '../../tools/evidence/types';
import type { SearchHit } from '../shared/public-contracts';
export type { SearchHit };
export type { SourceRef };
export type EvidenceLevel = 'observed-static' | 'confirmed-helper' | 'observed-runtime' | 'unresolved';
export type Verification = 'pending' | 'passed' | 'unverified-visual-nonblocking';
export type UnitSystem = 'Metric' | 'Imperial';
export type LegacyCulture = { name: string; decimalSeparator: string; groupSeparator: string };
export type RawTable = { id: string; sourceHash: string; rows: readonly (readonly string[])[] };
export interface Catalog { revision: string; table(id: string): RawTable; template(id: string): LegacyTemplate }
export type WorkAction = { type: 'select-route'; routeId: string }
  | { type: 'search'; query: string }
  | { type: 'select-option'; controlId: string; value: string }
  | { type: 'configure'; units: UnitSystem; listUnits: 'Inches' | 'Millimetres'; temperature: 'Celsius' | 'Fahrenheit'; fractions: boolean }
  | { type: 'input'; fieldId: string; raw: string } | { type: 'back' | 'forward' | 'reset' };
// Original sparse coordinates: ActiveDba[bank,row,column], lineMem[row,column].
// Task4/5 will refine the fields without changing the source index semantics.
// CLR string arrays start with null cells; sparse absence is a separate index state.
export type LegacyCell = string | null;
export type DrawingBuffers = { lineVar2: Record<number, LegacyCell>; c:number; colr:number; linetype:number; sc:number; lc:number; factor:number };
export type LegacyBuffers = { activeDba: Record<number, Record<number, Record<number, LegacyCell>>>; lineMem: Record<number, Record<number, LegacyCell>>; drawing?: DrawingBuffers };
export type LegacyValues = Record<string, string | number | boolean>;
export type LegacySession = { settings: Record<string, LegacyValues>; lastView: LegacyView | null };
export type WorkState = { routeId: string; culture: LegacyCulture; values: LegacyValues; history: { ids: string[]; index: number }; legacyBuffers: LegacyBuffers; revision: number; legacySession?: LegacySession };
export type TraceEvent = { operation: string; sourceId: string; row?: number; column?: number; value?: string };
export type WorkResult = { state: WorkState; view: LegacyView; evidenceIds: string[]; trace: TraceEvent[]; searchHits?: SearchHit[] };
export type InputResult = { ok: true; state: WorkState } | { ok: false; state: WorkState; messages: string[] };
export type FeatureRoute = { id: string; apply(state: WorkState, action: WorkAction, catalog: Catalog): WorkResult };
export type LegacyControl = { id: string; sourceId: string; type: string; text: string; options: { value: string; text: string; enabled: boolean }[]; enabled: boolean; checked: boolean; visible: boolean; layout: { x: number; y: number; width: number; height: number }; sourceRefs: SourceRef[]; showDropDownArrow?: boolean };
export type LegacyTextResults = { status: 'available' | 'unavailable'; rows: { id: string; label: string; value: string; unit: string; kind?: 'input' | 'output' }[] };
export type LegacyView = { headers: string[]; controls: LegacyControl[]; drawing: DisplayList; messages: string[]; visibility: Record<string, boolean>; textResults?: LegacyTextResults };
export type Point = { x: number; y: number };
export type DrawCommand = { op: 'line'; from: Point; to: Point; color: string; width: number }
  | { op: 'fillRect'; x: number; y: number; width: number; height: number; color: string }
  | { op: 'text'; text: string; x: number; y: number; font: string; align: 'left' | 'center' | 'right'; color: string; verticalAlign?: 'top' | 'bottom' };
export type DisplayList = { width: number; height: number; transform: number[]; commands: DrawCommand[] };
export type LegacyLine = { sourceId: string; sourceRefs: SourceRef[]; tokenOffsets: { start: number; end: number }; from: Point; to: Point; rawColor: number | null; rawColorToken:string; inheritedColorRule: 'explicit' | 'previous-line'; internalColor:number; layer:number };
// Exact private bytes are needed to replay partial clearing and inherited state.
export type LegacyTemplate = { id: string; sourceHash: string; records: LegacyLine[]; sourceBytes?: readonly number[] };
