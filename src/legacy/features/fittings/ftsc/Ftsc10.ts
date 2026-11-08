import { forgedRoute } from '../forged';
export const Ftsc10=forgedRoute({
  "id": "Ftsc10",
  "minimum": 3,
  "sensor": 2,
  "line": 24314,
  "weight": 6,
  "disabled": [
    "2000#",
    "9000#"
  ],
  file(rating,imperial){return "Ftsc10_Threaded_Hex_Head_Plug_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
