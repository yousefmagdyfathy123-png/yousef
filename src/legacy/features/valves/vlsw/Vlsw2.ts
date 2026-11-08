import { valveRoute } from '../recipe';
export const Vlsw2=valveRoute({
  "id": "Vlsw2",
  "line": 44546,
  "minimum": 5,
  "qty": 5,
  "subtab": "Ftsc2a",
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
  file(state){const v=state.values;return "Vlsc/"+(v.Units==='Imperial'?"Vlsc2_Imperial_" + String(v.ValveClass).slice(0,-1):"Vlsc2_" + String(v.ValveClass).slice(0,-1))+'.csv';}
});
