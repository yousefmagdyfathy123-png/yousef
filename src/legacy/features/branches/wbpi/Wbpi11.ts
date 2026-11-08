import { branchRoute } from '../branch';
export const Wbpi11=branchRoute({
  "id": "Wbpi11",
  "line": 47414,
  "minimum": 5,
  "lower": 5,
  "subtab": "Wbpi11",
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
  "elbow": true,
  "weight": 0,
  "smallBank": 1,
  file(state){return "Pipt4";}
});
