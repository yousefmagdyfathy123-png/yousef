import { branchRoute } from '../branch';
export const Wbol7=branchRoute({
  "id": "Wbol7",
  "line": 45718,
  "minimum": 5,
  "lower": 5,
  "subtab": "Wbol7a",
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
  "weight": 12,
  "smallBank": 1,
  file(state){return "Sol"+String(state.values.Rating).slice(0,-1);}
});
