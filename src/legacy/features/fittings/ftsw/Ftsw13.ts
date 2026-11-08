import { forgedRoute } from '../forged';
export const Ftsw13=forgedRoute({
  "id": "Ftsw13",
  "minimum": 4,
  "sensor": 2,
  "line": 26031,
  "weight": 5,
  "disabled": [
    "2000#",
    "9000#"
  ],
  file(rating,imperial){return "Ftsw13"+rating.slice(0,-3);}
});
