import { branchRoute } from '../branch';
export const Wbpi1=branchRoute({
  "id": "Wbpi1",
  "line": 46808,
  "minimum": 5,
  "lower": 5,
  "subtab": "Wbpi1",
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
      "140"
    ]
  },
  "elbow": false,
  "weight": 5,
  "smallBank": 1,
  file(state){return "Wbpi1_"+state.values.Sch;}
});
