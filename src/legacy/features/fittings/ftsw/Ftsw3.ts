import { forgedRoute } from '../forged';
export const Ftsw3=forgedRoute({
  "id": "Ftsw3",
  "minimum": 3,
  "sensor": 3,
  "line": 25445,
  "weight": 13,
  "disabled": [
    "2000#"
  ],
  file(rating,imperial){return "Ftsw3_Socketwelded_Tee_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
