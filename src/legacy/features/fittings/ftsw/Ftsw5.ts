import { forgedRoute } from '../forged';
export const Ftsw5=forgedRoute({
  "id": "Ftsw5",
  "minimum": 3,
  "sensor": 3,
  "line": 25559,
  "weight": 13,
  "disabled": [
    "2000#"
  ],
  file(rating,imperial){return "Ftsw5_Socketwelded_Coupling_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
