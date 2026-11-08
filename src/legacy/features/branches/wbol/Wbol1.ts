import { branchRoute } from '../branch';
export const Wbol1=branchRoute({
  "id": "Wbol1",
  "line": 45281,
  "minimum": 5,
  "lower": 5,
  "subtab": "Wbola",
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
  "weight": 6,
  "smallBank": 1,
  file(state){return "Wol"+state.values.Sch;}
});
