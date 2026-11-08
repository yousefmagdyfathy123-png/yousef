import { forgedRoute } from '../forged';
export const Ftsw14=forgedRoute({
  "id": "Ftsw14",
  "minimum": 3,
  "sensor": 2,
  "line": 26090,
  "weight": null,
  "disabled": [
    "2000#"
  ],
  file(rating,imperial){return "Ftsw1_Socketwelded_90_Deg_Elbow_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
