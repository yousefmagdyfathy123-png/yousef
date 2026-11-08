import { branchRoute } from '../branch';
export const Wbpi8=branchRoute({
  "id": "Wbpi8",
  "line": 47262,
  "minimum": 3,
  "lower": 4,
  "subtab": "Wbpi8",
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
  "weight": 4,
  "smallBank": 2,
  file(state){return "SocketweldedElbowPipet_"+String(state.values.Rating).slice(0,-1);}
});
