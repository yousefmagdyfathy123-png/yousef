import { forgedRoute } from '../forged';
export const Ftsc4=forgedRoute({
  "id": "Ftsc4",
  "minimum": 3,
  "sensor": 2,
  "line": 23962,
  "weight": 8,
  "disabled": [
    "9000#"
  ],
  file(rating,imperial){return "Ftsc4_Threaded_45deg_Elbow_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
