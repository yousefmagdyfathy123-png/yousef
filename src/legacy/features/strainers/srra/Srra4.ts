import { strainerRoute } from '../recipe';
export const Srra4=strainerRoute({
  "id": "Srra4",
  "line": 48340,
  "minimum": 3,
  "qty": 4,
  "subtab": "Srra4a",
  "chk": "U_Z",
  "fields": [
    "MainSize"
  ],
  "disabled": [],
  "sensor": 3,
  "error": "nuts",
  "weights": [
    8
  ],
  file(state){const v=state.values;return "Srra/"+(v.Units==='Imperial'?"SrrA4_Imperial_150":"SrrA4_150")+'.csv';}
});
