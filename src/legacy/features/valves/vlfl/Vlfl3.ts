import { valveRoute } from '../recipe';
export const Vlfl3=valveRoute({
  "id": "Vlfl3",
  "line": 27670,
  "minimum": 3,
  "qty": 8,
  "subtab": "Vlfl3a",
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
  "weight": 12,
  "note": "",
  "spec": true,
  file(state){const v=state.values;return "Vlfl/"+(v.Units==='Imperial'?"Vlv3_Imperial_" + String(v.ASMEClass).slice(0,-1):"Vlv3" + String(v.ASMEClass).slice(0,-1))+'.csv';}
});
