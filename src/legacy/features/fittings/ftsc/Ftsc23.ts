import { forgedRoute } from '../forged';
export const Ftsc23=forgedRoute({
  "id": "Ftsc23",
  "minimum": 4,
  "sensor": 2,
  "line": 25095,
  "weight": 7,
  "disabled": [
    "2000#",
    "9000#"
  ],
  file(rating,imperial){return "Ftsc23"+rating.slice(0,-3)+(imperial?'_Inches':'_Millimetres');}
});
