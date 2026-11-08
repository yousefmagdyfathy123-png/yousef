import { branchRoute } from '../branch';
export const Wbol9=branchRoute({
  "id": "Wbol9",
  "line": 45863,
  "minimum": 5,
  "lower": 5,
  "subtab": "Wbol9a",
  "fields": [
    "MainSize",
    "SmallSize",
    "Rating"
  ],
  "disabled": {
    "Rating": [
      "2000#",
      "9000#"
    ]
  },
  "elbow": false,
  "weight": 8,
  "smallBank": 1,
  file(state){return "Lol"+String(state.values.Rating).slice(0,-1);}
});
