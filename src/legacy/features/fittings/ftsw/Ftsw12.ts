import { forgedRoute } from '../forged';
export const Ftsw12=forgedRoute({
  "id": "Ftsw12",
  "minimum": 6,
  "sensor": 3,
  "line": 25971,
  "weight": 4,
  "disabled": [
    "2000#",
    "9000#"
  ],
  "limits": [
    35,
    36
  ],
  file(rating,imperial){return "Ftsw12"+rating.slice(0,-3);}
});
