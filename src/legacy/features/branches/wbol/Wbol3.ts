import { branchRoute } from '../branch';
export const Wbol3=branchRoute({
  "id": "Wbol3",
  "line": 45445,
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
  "elbow": false,
  "weight": 8,
  "smallBank": 1,
  file(state){return "Lol"+String(state.values.Rating).slice(0,-1);}
});
