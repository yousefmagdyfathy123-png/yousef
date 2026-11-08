import { strainerRoute } from '../recipe';
export const Srra2=strainerRoute({
  "id": "Srra2",
  "line": 48220,
  "minimum": 3,
  "qty": 4,
  "subtab": "Srra2a",
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
  "sensor": 3,
  "error": "size-class",
  "weights": [
    8
  ],
  file(state){const v=state.values;return "Srra/"+(v.Units==='Imperial'?"Srra2_Imperial_" + String(v.ASMEClass).slice(0,-1):"Srra2_" + String(v.ASMEClass).slice(0,-1))+'.csv';}
});
