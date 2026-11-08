import { branchRoute } from '../branch';
export const Wbol8=branchRoute({
  "id": "Wbol8",
  "line": 45785,
  "minimum": 5,
  "lower": 5,
  "subtab": "Wbol8a",
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
  "elbow": true,
  "weight": 8,
  "smallBank": 1,
  file(state){return "Eol"+String(state.values.Rating).slice(0,-1);}
});
