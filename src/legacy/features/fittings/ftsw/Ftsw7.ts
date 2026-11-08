import { forgedRoute } from '../forged';
export const Ftsw7=forgedRoute({
  "id": "Ftsw7",
  "minimum": 3,
  "sensor": 6,
  "line": 25673,
  "weight": 13,
  "disabled": [
    "2000#"
  ],
  file(rating,imperial){return "Ftsw7_Socketwelded_Cap_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
