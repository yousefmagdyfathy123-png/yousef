import { branchRoute } from '../branch';
export const Wbpi12=branchRoute({
  "id": "Wbpi12",
  "line": 47466,
  "minimum": 5,
  "lower": 5,
  "subtab": "Wbpi12",
  "fields": [
    "MainSize",
    "SmallSize",
    "ASMEClass"
  ],
  "disabled": {
    "ASMEClass": [
      "400#"
    ]
  },
  "elbow": false,
  "weight": 0,
  "smallBank": 1,
  file(state){return "Pipt4";}
});
