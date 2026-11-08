import { strainerRoute } from '../recipe';
export const Srrc1=strainerRoute({
  "id": "Srrc1",
  "line": 48849,
  "minimum": 4,
  "qty": 1,
  "subtab": "Srrc1a",
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
    8,
    9
  ],
  file(state){const v=state.values;return "Srrc/"+(v.Units==='Imperial'?"Srrc1_Imperial_" + String(v.ASMEClass).slice(0,-1):"Srrc1_" + String(v.ASMEClass).slice(0,-1))+'.csv';}
});
