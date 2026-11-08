import { forgedRoute } from '../forged';
export const Ftsw10=forgedRoute({
  "id": "Ftsw10",
  "minimum": 6,
  "sensor": 3,
  "line": 25849,
  "weight": 4,
  "disabled": [
    "2000#",
    "6000#",
    "9000#"
  ],
  "limits": [
    5,
    6
  ],
  file(rating,imperial){return "Ftsw10"+rating.slice(0,-3);}
});
