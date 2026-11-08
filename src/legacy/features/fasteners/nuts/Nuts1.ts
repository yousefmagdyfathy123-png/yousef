import { fastenerRoute } from '../recipe';
export const Nuts1=fastenerRoute({
  "id": "Nuts1",
  "line": 47997,
  "minimum": 3,
  "qty": 1,
  "subtab": "Nuts1a",
  "chk": "U_Z",
  "fields": [
    "MainSize"
  ],
  "disabled": [],
  "sensor": 3,
  "error": "nuts",
  "weights": [
    9
  ],
  file(state){const v=state.values;return "Nuts/"+(v.Units==='Imperial'?"Nuts1":"Nuts1")+'.csv';}
});
