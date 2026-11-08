import { strainerRoute } from '../recipe';
export const Srrb2=strainerRoute({
  "id": "Srrb2",
  "line": 48605,
  "minimum": 3,
  "qty": 2,
  "subtab": "Srrb2a",
  "chk": "U_C_Z",
  "fields": [
    "MainSize",
    "ASMEClass"
  ],
  "disabled": [
    "300#",
    "400#",
    "600#",
    "900#",
    "1500#",
    "2500#"
  ],
  "sensor": 2,
  "error": "size-class",
  "weights": [
    12
  ],
  file(state){const v=state.values;return "Srrb/"+(v.Units==='Imperial'?"Srrb2_Imperial_" + String(v.ASMEClass).slice(0,-1):"Srrb2_" + String(v.ASMEClass).slice(0,-1))+'.csv';}
});
