import { forgedRoute } from '../forged';
export const Ftsw2=forgedRoute({
  "id": "Ftsw2",
  "minimum": 3,
  "sensor": 3,
  "line": 25388,
  "weight": 13,
  "disabled": [
    "2000#"
  ],
  file(rating,imperial){return "Ftsw2_Socketwelded_45_Deg_Elbow_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
