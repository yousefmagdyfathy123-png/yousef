import { branchRoute } from '../branch';
export const Wbol10=branchRoute({
  "id": "Wbol10",
  "line": 45930,
  "minimum": 5,
  "lower": 5,
  "subtab": "Wbol10a",
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
      "60",
      "80s",
      "100",
      "120",
      "140"
    ],
    "ASMEClass": [
      "400#"
    ]
  },
  "elbow": false,
  "weight": 6,
  "smallBank": 2,
  file(state){return "Weldoflange"+String(state.values.ASMEClass).slice(0,-1);}
});
