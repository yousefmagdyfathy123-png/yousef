import { branchRoute } from '../branch';
export const Wbpi4=branchRoute({
  "id": "Wbpi4",
  "line": 47058,
  "minimum": 3,
  "lower": 4,
  "subtab": "Wbpi4",
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
  file(state){return "ThreadedPipet_"+String(state.values.Rating).slice(0,-1);}
});
