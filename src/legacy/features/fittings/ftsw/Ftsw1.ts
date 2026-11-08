import { forgedRoute } from '../forged';
export const Ftsw1=forgedRoute({
  "id": "Ftsw1",
  "minimum": 3,
  "sensor": 3,
  "line": 25331,
  "weight": 13,
  "disabled": [
    "2000#"
  ],
  file(rating,imperial){return "Ftsw1_Socketwelded_90_Deg_Elbow_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
