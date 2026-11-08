import { strainerRoute } from '../recipe';
export const Srrb3=strainerRoute({
  "id": "Srrb3",
  "line": 48674,
  "minimum": 3,
  "qty": 2,
  "subtab": "Srrb3a",
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
  file(state){const v=state.values;return "Srrb/"+(v.Units==='Imperial'?"Srrb3_Imperial_" + String(v.ASMEClass).slice(0,-1):"Srrb3_" + String(v.ASMEClass).slice(0,-1))+'.csv';}
});
