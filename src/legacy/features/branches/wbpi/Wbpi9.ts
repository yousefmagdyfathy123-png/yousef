import { branchRoute } from '../branch';
export const Wbpi9=branchRoute({
  "id": "Wbpi9",
  "line": 47316,
  "minimum": 3,
  "lower": 4,
  "subtab": "Wbpi9",
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
  "weight": 4,
  "smallBank": 2,
  file(state){return "SocketweldedLateralPipet_"+String(state.values.Rating).slice(0,-1);}
});
