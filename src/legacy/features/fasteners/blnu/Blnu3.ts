import { fastenerRoute } from '../recipe';
export const Blnu3=fastenerRoute({
  "id": "Blnu3",
  "line": 43398,
  "minimum": 3,
  "qty": 4,
  "subtab": "Blnu3a",
  "chk": "U_C_Z",
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
    11
  ],
  file(state){const v=state.values;return "Blnu/"+(v.Units==='Imperial'?"Blnu3_" + String(v.ASMEClassIndex) + "_" + String(v.ASMEClass).slice(0,-1) + "_Inches":"Blnu3_" + String(v.ASMEClassIndex) + "_" + String(v.ASMEClass).slice(0,-1) + "_Millimetres")+'.csv';}
});
