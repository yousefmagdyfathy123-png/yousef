import { forgedRoute } from '../forged';
export const Ftsc17=forgedRoute({
  "id": "Ftsc17",
  "minimum": 3,
  "sensor": 2,
  "line": 24733,
  "weight": 8,
  "disabled": [
    "2000#",
    "9000#"
  ],
  file(rating,imperial){return "Ftsc17"+rating.slice(0,-3)+(imperial?'_Inches':'_Millimetres');}
});
