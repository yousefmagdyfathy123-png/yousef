import { forgedRoute } from '../forged';
export const Ftsc24=forgedRoute({
  "id": "Ftsc24",
  "minimum": 4,
  "sensor": 2,
  "line": 25154,
  "weight": 5,
  "disabled": [
    "2000#",
    "9000#"
  ],
  file(rating,imperial){return "Ftsc24"+rating.slice(0,-3)+(imperial?'_Inches':'_Millimetres');}
});
