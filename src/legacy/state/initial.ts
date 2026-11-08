import type { LegacyCulture, WorkState, WorkAction } from '../contracts';
import { assertLegacyCulture } from '../vb/culture';
import { loadSettings } from './settings';
import { configureState, loadConfig } from './configure';
export type StartupPreferences = Extract<WorkAction, { type: 'configure' }>;
export function createInitialState(culture: LegacyCulture, preferences?: StartupPreferences): WorkState {
  assertLegacyCulture(culture);
  const state:WorkState={routeId:'Flan1',culture:{...culture},values:{Units:'Metric',ListUnits:'Inches',DegUnits:'Celsius',Fractionize:'No'},history:{ids:['Flan1'],index:0},legacyBuffers:{activeDba:{},lineMem:{}},revision:0,legacySession:{settings:{},lastView:null}};
  loadConfig(state);loadSettings(state);
  if(preferences)configureState(state,preferences);
  return state;
}
