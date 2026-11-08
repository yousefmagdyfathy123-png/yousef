import { forgedRoute } from '../forged';
export const Ftsc12=forgedRoute({
  "id": "Ftsc12",
  "minimum": 3,
  "sensor": 2,
  "line": 24432,
  "weight": 6,
  "disabled": [
    "2000#",
    "9000#"
  ],
  file(rating,imperial){return "Ftsc12_Threaded_Hex_Head_Bushing_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
