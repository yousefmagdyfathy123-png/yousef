import { fastenerRoute } from '../recipe';
export const Nuts2=fastenerRoute({
  "id": "Nuts2",
  "line": 48037,
  "minimum": 3,
  "qty": 1,
  "subtab": "Nuts2",
  "chk": "U_Z",
  "fields": [
    "MainSize"
  ],
  "disabled": [],
  "sensor": 3,
  "error": "nuts",
  "weights": [
    10
  ],
  file(state){const v=state.values;return "Nuts/"+(v.Units==='Imperial'?"Nuts2":"Nuts2")+'.csv';}
});
