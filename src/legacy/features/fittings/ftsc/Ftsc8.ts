import { forgedRoute } from '../forged';
export const Ftsc8=forgedRoute({
  "id": "Ftsc8",
  "minimum": 3,
  "sensor": 2,
  "line": 24196,
  "weight": 6,
  "disabled": [
    "2000#",
    "9000#"
  ],
  file(rating,imperial){return "Ftsc8_Threaded_Cap_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
