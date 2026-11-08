import { forgedRoute } from '../forged';
export const Ftsw8=forgedRoute({
  "id": "Ftsw8",
  "minimum": 4,
  "sensor": 3,
  "line": 25730,
  "weight": 19,
  "disabled": [
    "2000#",
    "9000#"
  ],
  "limits": [
    7,
    8
  ],
  file(rating,imperial){return "Ftsw8"+rating.slice(0,-3);}
});
