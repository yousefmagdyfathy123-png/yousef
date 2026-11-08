import { valveRoute } from '../recipe';
export const Vlfl8=valveRoute({
  "id": "Vlfl8",
  "line": 27968,
  "minimum": 4,
  "qty": 8,
  "subtab": "Vlfl8a",
  "chk": "U_C_Z",
  "fields": [
    "MainSize",
    "ASMEClass",
    "Actuator"
  ],
  "disabled": [
    "400#",
    "900#",
    "1500#",
    "2500#"
  ],
  "sensor": "face",
  "error": "size-class",
  "weight": 16,
  "note": "",
  "spec": true,
  file(state){const v=state.values;return "Vlfl/"+(v.Units==='Imperial'?"Vlv8_Imperial_" + String(v.ASMEClass).slice(0,-1):"Vlv8" + String(v.ASMEClass).slice(0,-1))+'.csv';}
});
