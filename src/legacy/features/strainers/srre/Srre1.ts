import { strainerRoute } from '../recipe';
export const Srre1=strainerRoute({
  "id": "Srre1",
  "line": 49061,
  "minimum": 4,
  "qty": 1,
  "subtab": "Srre1a",
  "chk": "U_C_Z",
  "fields": [
    "MainSize",
    "ASMEClass"
  ],
  "disabled": [
    "400#",
    "600#",
    "900#",
    "1500#",
    "2500#"
  ],
  "sensor": 2,
  "error": "size-class",
  "weights": [
    8
  ],
  file(state){const v=state.values;return "Srre/"+(v.Units==='Imperial'?"Srre1_Imperial_" + String(v.ASMEClass).slice(0,-1):"Srre1_" + String(v.ASMEClass).slice(0,-1))+'.csv';}
});
