import { branchRoute } from '../branch';
export const Wbol11=branchRoute({
  "id": "Wbol11",
  "line": 46022,
  "minimum": 5,
  "lower": 5,
  "subtab": "Wbol11a",
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
  "elbow": true,
  "weight": 5,
  "smallBank": 2,
  file(state){return "Elboflange"+String(state.values.ASMEClass).slice(0,-1);}
});
