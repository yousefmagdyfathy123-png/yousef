import { branchRoute } from '../branch';
export const Wbol5=branchRoute({
  "id": "Wbol5",
  "line": 45579,
  "minimum": 5,
  "lower": 5,
  "subtab": "Wbo5a",
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
