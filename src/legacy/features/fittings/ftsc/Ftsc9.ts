import { forgedRoute } from '../forged';
export const Ftsc9=forgedRoute({
  "id": "Ftsc9",
  "minimum": 3,
  "sensor": 2,
  "line": 24255,
  "weight": 6,
  "disabled": [
    "2000#",
    "9000#"
  ],
  file(rating,imperial){return "Ftsc9_Threaded_Square_Head_Plug_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
