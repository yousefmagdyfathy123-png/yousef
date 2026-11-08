import { valveRoute } from '../recipe';
export const Vlbw2=valveRoute({
  "id": "Vlbw2",
  "line": 43746,
  "minimum": 3,
  "qty": 4,
  "subtab": "Vlbw2a",
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
  file(state){const v=state.values;return "Vlfl/"+(v.Units==='Imperial'?"Vlv2_Imperial_" + String(v.ASMEClass).slice(0,-1):"Vlv2" + String(v.ASMEClass).slice(0,-1))+'.csv';}
});
