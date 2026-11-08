import { valveRoute } from '../recipe';
export const Vlbw3=valveRoute({
  "id": "Vlbw3",
  "line": 43803,
  "minimum": 7,
  "qty": 4,
  "subtab": "Vlbw3a",
  "chk": "U_C_Z",
  "fields": [
    "MainSize",
    "ASMEClass"
  ],
  "disabled": [
    "400#"
  ],
  "sensor": 4,
  "error": "size-class",
  "weight": 13,
  "note": "Weight based on 'Schlumberger/Cameron' reduced bore valves",
  "spec": true,
  file(state){const v=state.values;return "Vlfl/"+(v.Units==='Imperial'?"Vlv3_Imperial_" + String(v.ASMEClass).slice(0,-1):"Vlv3" + String(v.ASMEClass).slice(0,-1))+'.csv';}
});
