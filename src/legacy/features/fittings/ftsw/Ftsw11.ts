import { forgedRoute } from '../forged';
export const Ftsw11=forgedRoute({
  "id": "Ftsw11",
  "minimum": 6,
  "sensor": 3,
  "line": 25911,
  "weight": 6,
  "disabled": [
    "2000#",
    "9000#"
  ],
  "limits": [
    4,
    5
  ],
  file(rating,imperial){return "Ftsw11"+rating.slice(0,-3);}
});
