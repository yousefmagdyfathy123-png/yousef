import { forgedRoute } from '../forged';
export const Ftsc5=forgedRoute({
  "id": "Ftsc5",
  "minimum": 3,
  "sensor": 2,
  "line": 24019,
  "weight": 5,
  "disabled": [
    "2000#",
    "9000#"
  ],
  file(rating,imperial){return "Ftsc5_Threaded_90deg_Street_Elbow_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
