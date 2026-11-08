import { forgedRoute } from '../forged';
export const Ftsw9=forgedRoute({
  "id": "Ftsw9",
  "minimum": 4,
  "sensor": 2,
  "line": 25790,
  "weight": 7,
  "disabled": [
    "2000#",
    "9000#"
  ],
  file(rating,imperial){return "Ftsw9"+rating.slice(0,-3);}
});
