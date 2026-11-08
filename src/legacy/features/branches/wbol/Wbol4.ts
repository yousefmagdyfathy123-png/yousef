import { branchRoute } from '../branch';
export const Wbol4=branchRoute({
  "id": "Wbol4",
  "line": 45512,
  "minimum": 4,
  "lower": 5,
  "subtab": "Wbo4a",
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
  "weight": 7,
  "smallBank": 1,
  file(state){return "Tol"+String(state.values.Rating).slice(0,-1);}
});
