import { valveRoute } from '../recipe';
export const Vlsc3=valveRoute({
  "id": "Vlsc3",
  "line": 44166,
  "minimum": 5,
  "qty": 5,
  "subtab": "Ftsc3a",
  "chk": "U_V_Z",
  "fields": [
    "MainSize",
    "ValveClass"
  ],
  "disabled": [],
  "sensor": 2,
  "error": "size-valve-class",
  "weight": 5,
  "note": "",
  "spec": true,
  file(state){const v=state.values;return "Vlsc/"+(v.Units==='Imperial'?"Vlsc3_Imperial_" + String(v.ValveClass).slice(0,-1):"Vlsc3_" + String(v.ValveClass).slice(0,-1))+'.csv';}
});
