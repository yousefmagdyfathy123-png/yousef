import { strainerRoute } from '../recipe';
export const Srrd1=strainerRoute({
  "id": "Srrd1",
  "line": 48955,
  "minimum": 4,
  "qty": 1,
  "subtab": "Srrd1a",
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
    9,
    10
  ],
  file(state){const v=state.values;return "Srrd/"+(v.Units==='Imperial'?"Srrd1_Imperial_" + String(v.ASMEClass).slice(0,-1):"Srrd1_" + String(v.ASMEClass).slice(0,-1))+'.csv';}
});
