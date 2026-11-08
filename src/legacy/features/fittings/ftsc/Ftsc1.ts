import { forgedRoute } from '../forged';
export const Ftsc1=forgedRoute({
  "id": "Ftsc1",
  "minimum": 3,
  "sensor": 2,
  "line": 23791,
  "weight": 8,
  "disabled": [
    "9000#"
  ],
  file(rating,imperial){return "Ftsc1_Threaded_90deg_Elbow_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
