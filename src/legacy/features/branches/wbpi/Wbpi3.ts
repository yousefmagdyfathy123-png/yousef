import { branchRoute } from '../branch';
export const Wbpi3=branchRoute({
  "id": "Wbpi3",
  "line": 46976,
  "minimum": 5,
  "lower": 5,
  "subtab": "Wbpi3",
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
  "elbow": false,
  "weight": 4,
  "smallBank": 1,
  file(state){return "Wbpi3_"+state.values.Sch;}
});
