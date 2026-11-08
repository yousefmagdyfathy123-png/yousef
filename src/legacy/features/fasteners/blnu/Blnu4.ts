import { fastenerRoute } from '../recipe';
export const Blnu4=fastenerRoute({
  "id": "Blnu4",
  "line": 43457,
  "minimum": 3,
  "qty": 4,
  "subtab": "Blnu4a",
  "chk": "U_F_C_Z",
  "fields": [
    "MainSize",
    "ASMEClass"
  ],
  "disabled": [
    "400#"
  ],
  "sensor": 3,
  "error": "size-class-face",
  "weights": [
    12,
    13
  ],
  file(state){const v=state.values;return "Blnu/"+(v.Units==='Imperial'?"Blnu3_" + String(v.ASMEClassIndex) + "_" + String(v.ASMEClass).slice(0,-1) + "_Inches":"Blnu3_" + String(v.ASMEClassIndex) + "_" + String(v.ASMEClass).slice(0,-1) + "_Millimetres")+'.csv';}
});
