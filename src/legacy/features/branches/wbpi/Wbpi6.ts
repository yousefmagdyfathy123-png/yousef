import { branchRoute } from '../branch';
export const Wbpi6=branchRoute({
  "id": "Wbpi6",
  "line": 47162,
  "minimum": 3,
  "lower": 4,
  "subtab": "Wbpi6",
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
  file(state){return "ThreadedLateralPipet_"+String(state.values.Rating).slice(0,-1);}
});
