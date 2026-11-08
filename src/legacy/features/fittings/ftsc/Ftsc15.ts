import { forgedRoute } from '../forged';
export const Ftsc15=forgedRoute({
  "id": "Ftsc15",
  "minimum": 4,
  "sensor": 3,
  "line": 24612,
  "weight": 13,
  "disabled": [
    "2000#",
    "9000#"
  ],
  "limits": [
    19
  ],
  file(rating,imperial){return "Ftsc15"+rating.slice(0,-3)+(imperial?'_Inches':'_Millimetres');}
});
