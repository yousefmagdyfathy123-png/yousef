import { valveRoute } from '../recipe';
export const Vlsc1=valveRoute({
  "id": "Vlsc1",
  "line": 44056,
  "minimum": 5,
  "qty": 5,
  "subtab": "Ftsc1a",
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
  file(state){const v=state.values;return "Vlsc/"+(v.Units==='Imperial'?"Vlsc1_Imperial_" + String(v.ValveClass).slice(0,-1):"Vlsc1_" + String(v.ValveClass).slice(0,-1))+'.csv';}
});
