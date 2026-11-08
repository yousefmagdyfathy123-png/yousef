import { valveRoute } from '../recipe';
export const Vlsc5=valveRoute({
  "id": "Vlsc5",
  "line": 44276,
  "minimum": 4,
  "qty": 5,
  "subtab": "Ftsc5a",
  "chk": "U_V_Z",
  "fields": [
    "MainSize",
    "ValveClass"
  ],
  "disabled": [],
  "sensor": 2,
  "error": "size-valve-class",
  "weight": 11,
  "note": "",
  "spec": true,
  file(state){const v=state.values;return "Vlsc/"+(v.Units==='Imperial'?"Vlsc5_Imperial_" + String(v.ValveClass).slice(0,-1):"Vlsc5_" + String(v.ValveClass).slice(0,-1))+'.csv';}
});
