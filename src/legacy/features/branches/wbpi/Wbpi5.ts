import { branchRoute } from '../branch';
export const Wbpi5=branchRoute({
  "id": "Wbpi5",
  "line": 47108,
  "minimum": 3,
  "lower": 4,
  "subtab": "Wbpi5",
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
  file(state){return "ThreadedElbowPipet_"+String(state.values.Rating).slice(0,-1);}
});
