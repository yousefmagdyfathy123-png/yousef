import { forgedRoute } from '../forged';
export const Ftsc7=forgedRoute({
  "id": "Ftsc7",
  "minimum": 3,
  "sensor": 2,
  "line": 24137,
  "weight": 5,
  "disabled": [
    "2000#",
    "9000#"
  ],
  file(rating,imperial){return "Ftsc7_Threaded_Half_Coupling_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
