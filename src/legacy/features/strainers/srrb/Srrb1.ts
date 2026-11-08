import { strainerRoute } from '../recipe';
export const Srrb1=strainerRoute({
  "id": "Srrb1",
  "line": 48538,
  "minimum": 3,
  "qty": 2,
  "subtab": "Srrb1a",
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
    13
  ],
  file(state){const v=state.values;return "Srrb/"+(v.Units==='Imperial'?"Srrb1_Imperial_" + String(v.ASMEClass).slice(0,-1):"Srrb1_" + String(v.ASMEClass).slice(0,-1))+'.csv';}
});
