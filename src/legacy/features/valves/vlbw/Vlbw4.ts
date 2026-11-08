import { valveRoute } from '../recipe';
export const Vlbw4=valveRoute({
  "id": "Vlbw4",
  "line": 43860,
  "minimum": 7,
  "qty": 4,
  "subtab": "Vlbw4a",
  "chk": "U_C_Z",
  "fields": [
    "MainSize",
    "ASMEClass"
  ],
  "disabled": [
    "400#"
  ],
  "sensor": 5,
  "error": "size-class",
  "weight": 12,
  "note": "Weight based on 'Schlumberger/Cameron' valves",
  "spec": true,
  file(state){const v=state.values;return "Vlfl/"+(v.Units==='Imperial'?"Vlv5_Imperial_" + String(v.ASMEClass).slice(0,-1):"Vlv5" + String(v.ASMEClass).slice(0,-1))+'.csv';}
});
