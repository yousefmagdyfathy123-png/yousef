import { forgedRoute } from '../forged';
export const Ftsc2=forgedRoute({
  "id": "Ftsc2",
  "minimum": 3,
  "sensor": 2,
  "line": 23848,
  "weight": 8,
  "disabled": [
    "9000#"
  ],
  file(rating,imperial){return "Ftsc2_Threaded_Tee_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
