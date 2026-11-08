import { branchRoute } from '../branch';
export const Wbol12=branchRoute({
  "id": "Wbol12",
  "line": 46117,
  "minimum": 5,
  "lower": 5,
  "subtab": "Wbol12a",
  "fields": [
    "MainSize",
    "SmallSize",
    "ASMEClass",
    "Sch"
  ],
  "disabled": {
    "Sch": [
      "5s",
      "5",
      "10s",
      "100",
      "120",
      "140"
    ],
    "ASMEClass": [
      "400#"
    ]
  },
  "elbow": false,
  "weight": 5,
  "smallBank": 1,
  file(state){return "Latroflange"+String(state.values.ASMEClass).slice(0,-1);}
});
