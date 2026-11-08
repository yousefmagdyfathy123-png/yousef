import { forgedRoute } from '../forged';
export const Ftsc3=forgedRoute({
  "id": "Ftsc3",
  "minimum": 3,
  "sensor": 2,
  "line": 23905,
  "weight": 8,
  "disabled": [
    "9000#"
  ],
  file(rating,imperial){return "Ftsc3_Threaded_Cross_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
