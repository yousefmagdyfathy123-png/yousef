import { forgedRoute } from '../forged';
export const Ftsw4=forgedRoute({
  "id": "Ftsw4",
  "minimum": 3,
  "sensor": 3,
  "line": 25502,
  "weight": 13,
  "disabled": [
    "2000#"
  ],
  file(rating,imperial){return "Ftsw4_Socketwelded_Cross_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
