import { forgedRoute } from '../forged';
export const Ftsc16=forgedRoute({
  "id": "Ftsc16",
  "minimum": 5,
  "sensor": 2,
  "line": 24673,
  "weight": 5,
  "disabled": [
    "2000#",
    "9000#"
  ],
  "limits": [
    6,
    7
  ],
  file(rating,imperial){return "Ftsc16"+rating.slice(0,-3)+(imperial?'_Inches':'_Millimetres');}
});
