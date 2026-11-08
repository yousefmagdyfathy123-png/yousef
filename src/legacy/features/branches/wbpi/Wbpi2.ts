import { branchRoute } from '../branch';
export const Wbpi2=branchRoute({
  "id": "Wbpi2",
  "line": 46890,
  "minimum": 5,
  "lower": 5,
  "subtab": "Wbpi2",
  "fields": [
    "MainSize",
    "SmallSize",
    "Sch"
  ],
  "disabled": {
    "Sch": [
      "5s",
      "5",
      "10s",
      "10",
      "20",
      "30",
      "40s",
      "40",
      "60",
      "80s",
      "80",
      "100",
      "120",
      "140",
      "160",
      "XXS"
    ]
  },
  "elbow": true,
  "weight": 4,
  "smallBank": 1,
  file(state){return "Wbpi2_"+state.values.Sch;}
});
