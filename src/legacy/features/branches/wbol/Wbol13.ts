import { branchRoute } from '../branch';
export const Wbol13=branchRoute({
  "id": "Wbol13",
  "line": 46207,
  "minimum": 5,
  "lower": 5,
  "subtab": "Wbol13a",
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
  "weight": 4,
  "smallBank": 1,
  file(state){return "Nipoflange"+String(state.values.ASMEClass).slice(0,-1);}
});
