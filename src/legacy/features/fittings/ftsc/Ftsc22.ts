import { forgedRoute } from '../forged';
export const Ftsc22=forgedRoute({
  "id": "Ftsc22",
  "minimum": 4,
  "sensor": 2,
  "line": 25034,
  "weight": 7,
  "disabled": [
    "2000#",
    "6000#",
    "9000#"
  ],
  file(rating,imperial){return "Ftsc19"+rating.slice(0,-3)+(imperial?'_Inches':'_Millimetres');}
});
