import { forgedRoute } from '../forged';
export const Ftsc11=forgedRoute({
  "id": "Ftsc11",
  "minimum": 3,
  "sensor": 2,
  "line": 24373,
  "weight": 6,
  "disabled": [
    "2000#",
    "9000#"
  ],
  file(rating,imperial){return "Ftsc11_Threaded_Round_Head_Plug_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
