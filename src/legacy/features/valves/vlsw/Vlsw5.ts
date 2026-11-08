import { valveRoute } from '../recipe';
export const Vlsw5=valveRoute({
  "id": "Vlsw5",
  "line": 44711,
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
  file(state){const v=state.values;return "Vlsw/"+(v.Units==='Imperial'?"Vlsw5_Imperial_" + String(v.ValveClass).slice(0,-1):"Vlsw5_" + String(v.ValveClass).slice(0,-1))+'.csv';}
});
