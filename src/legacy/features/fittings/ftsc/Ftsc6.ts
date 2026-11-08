import { forgedRoute } from '../forged';
export const Ftsc6=forgedRoute({
  "id": "Ftsc6",
  "minimum": 3,
  "sensor": 2,
  "line": 24078,
  "weight": 5,
  "disabled": [
    "2000#",
    "9000#"
  ],
  file(rating,imperial){return "Ftsc6_Threaded_Coupling_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
