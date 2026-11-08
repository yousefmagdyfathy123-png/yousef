import { valveRoute } from '../recipe';
export const Vlfl2=valveRoute({
  "id": "Vlfl2",
  "line": 27620,
  "minimum": 3,
  "qty": 8,
  "subtab": "Vlfl2a",
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
  "note": "Weight based on 'Schlumberger/Cameron' valves",
  "spec": true,
  file(state){const v=state.values;return "Vlfl/"+(v.Units==='Imperial'?"Vlv2_Imperial_" + String(v.ASMEClass).slice(0,-1):"Vlv2" + String(v.ASMEClass).slice(0,-1))+'.csv';}
});
