import { branchRoute } from '../branch';
export const Wbpi10=branchRoute({
  "id": "Wbpi10",
  "line": 47366,
  "minimum": 5,
  "lower": 5,
  "subtab": "Wbpi10",
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
