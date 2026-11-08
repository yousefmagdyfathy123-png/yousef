import { strainerRoute } from '../recipe';
export const Srra3=strainerRoute({
  "id": "Srra3",
  "line": 48287,
  "minimum": 3,
  "qty": 4,
  "subtab": "Srra3a",
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
  file(state){const v=state.values;return "Srra/"+(v.Units==='Imperial'?"SrrA3_Imperial_150":"SrrA3_150")+'.csv';}
});
