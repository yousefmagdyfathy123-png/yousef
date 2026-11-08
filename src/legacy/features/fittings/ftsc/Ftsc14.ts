import { forgedRoute } from '../forged';
export const Ftsc14=forgedRoute({
  "id": "Ftsc14",
  "minimum": 5,
  "sensor": 2,
  "line": 24550,
  "weight": 4,
  "disabled": [
    "2000#",
    "6000#",
    "9000#"
  ],
  "limits": [
    16,
    17
  ],
  file(rating,imperial){return "Ftsc14"+rating.slice(0,-3)+(imperial?'_Inches':'_Millimetres');}
});
