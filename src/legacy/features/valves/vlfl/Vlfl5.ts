import { valveRoute } from '../recipe';
export const Vlfl5=valveRoute({
  "id": "Vlfl5",
  "line": 27788,
  "minimum": 3,
  "qty": 8,
  "subtab": "Vlfl5a",
  "chk": "U_F_C_Z",
  "fields": [
    "MainSize",
    "ASMEClass",
    "Face"
  ],
  "disabled": [
    "400#"
  ],
  "sensor": "face",
  "error": "size-class-face",
  "weight": 11,
  "note": "Weight based on 'Schlumberger/Cameron' check valves",
  "spec": true,
  file(state){const v=state.values;return "Vlfl/"+(v.Units==='Imperial'?"Vlv5_Imperial_" + String(v.ASMEClass).slice(0,-1):"Vlv5" + String(v.ASMEClass).slice(0,-1))+'.csv';}
});
