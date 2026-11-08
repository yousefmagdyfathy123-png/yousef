import { strainerRoute } from '../recipe';
export const Srra1=strainerRoute({
  "id": "Srra1",
  "line": 48155,
  "minimum": 3,
  "qty": 4,
  "subtab": "Srra1a",
  "chk": "U_C_Z",
  "fields": [
    "MainSize",
    "ASMEClass"
  ],
  "disabled": [
    "400#",
    "900#",
    "1500#",
    "2500#"
  ],
  "sensor": 3,
  "error": "size-class",
  "weights": [
    8
  ],
  file(state){const v=state.values;return "Srra/"+(v.Units==='Imperial'?"Srra1_Imperial_" + String(v.ASMEClass).slice(0,-1):"Srra1_" + String(v.ASMEClass).slice(0,-1))+'.csv';}
});
