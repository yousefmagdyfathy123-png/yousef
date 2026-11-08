import { forgedRoute } from '../forged';
export const Ftsc18=forgedRoute({
  "id": "Ftsc18",
  "minimum": 4,
  "sensor": 2,
  "line": 24792,
  "weight": 6,
  "disabled": [
    "2000#",
    "9000#"
  ],
  file(rating,imperial){return "Ftsc18"+rating.slice(0,-3)+(imperial?'_Inches':'_Millimetres');}
});
