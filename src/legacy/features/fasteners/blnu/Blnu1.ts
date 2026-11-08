import { fastenerRoute } from '../recipe';
export const Blnu1=fastenerRoute({
  "id": "Blnu1",
  "line": 43262,
  "minimum": 3,
  "qty": 4,
  "subtab": "Blnu1a",
  "chk": "U_F_C_Z",
  "fields": [
    "MainSize",
    "ASMEClass",
    "Face"
  ],
  "disabled": [
    "400#"
  ],
  "sensor": 3,
  "error": "size-class-face",
  "weights": [
    12
  ],
  file(state){const v=state.values;return "Blnu/"+(v.Units==='Imperial'?(v.Face==='RTJ'?"Blnu1a_" + String(v.ASMEClassIndex) + "_" + String(v.ASMEClass).slice(0,-1) + "_Inches":"Blnu1_" + String(v.ASMEClassIndex) + "_" + String(v.ASMEClass).slice(0,-1) + "_Inches"):(v.Face==='RTJ'?"Blnu1a_" + String(v.ASMEClassIndex) + "_" + String(v.ASMEClass).slice(0,-1) + "_Millimetres":"Blnu1_" + String(v.ASMEClassIndex) + "_" + String(v.ASMEClass).slice(0,-1) + "_Millimetres"))+'.csv';}
});
