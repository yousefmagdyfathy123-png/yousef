import { forgedRoute } from '../forged';
export const Ftsw6=forgedRoute({
  "id": "Ftsw6",
  "minimum": 3,
  "sensor": 6,
  "line": 25616,
  "weight": 13,
  "disabled": [
    "2000#"
  ],
  file(rating,imperial){return "Ftsw6_Socketwelded_Half_Coupling_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
