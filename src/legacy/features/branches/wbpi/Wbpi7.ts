import { branchRoute } from '../branch';
export const Wbpi7=branchRoute({
  "id": "Wbpi7",
  "line": 47212,
  "minimum": 3,
  "lower": 4,
  "subtab": "Wbpi7",
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
  "weight": 5,
  "smallBank": 2,
  file(state){return "SocketweldedPipet_"+String(state.values.Rating).slice(0,-1);}
});
