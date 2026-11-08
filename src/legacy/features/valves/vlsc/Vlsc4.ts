import { valveRoute } from '../recipe';
export const Vlsc4=valveRoute({
  "id": "Vlsc4",
  "line": 44221,
  "minimum": 5,
  "qty": 5,
  "subtab": "Ftsc4a",
  "chk": "U_V_Z",
  "fields": [
    "MainSize",
    "ValveClass"
  ],
  "disabled": [],
  "sensor": 2,
  "error": "size-valve-class",
  "weight": 9,
  "note": "",
  "spec": true,
  file(state){const v=state.values;return "Vlsc/"+(v.Units==='Imperial'?"Vlsc4_Imperial_" + String(v.ValveClass).slice(0,-1):"Vlsc4_" + String(v.ValveClass).slice(0,-1))+'.csv';}
});
