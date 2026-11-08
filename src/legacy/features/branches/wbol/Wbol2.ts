import { branchRoute } from '../branch';
export const Wbol2=branchRoute({
  "id": "Wbol2",
  "line": 45373,
  "minimum": 5,
  "lower": 5,
  "subtab": "Wbola",
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
