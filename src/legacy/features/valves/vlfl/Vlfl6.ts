import { valveRoute } from '../recipe';
export const Vlfl6=valveRoute({
  "id": "Vlfl6",
  "line": 27846,
  "minimum": 3,
  "qty": 8,
  "subtab": "Vlfl6a",
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
  "spec": false,
  file(state){const v=state.values;return "Vlfl/"+(v.Units==='Imperial'?"Vlv6_Imperial_" + String(v.ASMEClass).slice(0,-1):"Vlv6" + String(v.ASMEClass).slice(0,-1))+'.csv';}
});
