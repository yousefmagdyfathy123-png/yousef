import { fastenerRoute } from '../recipe';
export const Blnu2=fastenerRoute({
  "id": "Blnu2",
  "line": 43330,
  "minimum": 3,
  "qty": 4,
  "subtab": "Blnu2a",
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
    13,
    14
  ],
  file(state){const v=state.values;return "Blnu/"+(v.Units==='Imperial'?(v.Face==='RTJ'?"Blnu1a_" + String(v.ASMEClassIndex) + "_" + String(v.ASMEClass).slice(0,-1) + "_Inches":"Blnu1_" + String(v.ASMEClassIndex) + "_" + String(v.ASMEClass).slice(0,-1) + "_Inches"):(v.Face==='RTJ'?"Blnu1a_" + String(v.ASMEClassIndex) + "_" + String(v.ASMEClass).slice(0,-1) + "_Millimetres":"Blnu1_" + String(v.ASMEClassIndex) + "_" + String(v.ASMEClass).slice(0,-1) + "_Millimetres"))+'.csv';}
});
