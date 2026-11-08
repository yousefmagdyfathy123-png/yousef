import { forgedRoute } from '../forged';
export const Ftsc13=forgedRoute({
  "id": "Ftsc13",
  "minimum": 3,
  "sensor": 2,
  "line": 24491,
  "weight": 6,
  "disabled": [
    "2000#",
    "9000#"
  ],
  file(rating,imperial){return "Ftsc13_Threaded_Flush_Bushing_"+rating.slice(0,-1)+(imperial?'_Inches':'_Millimetres');}
});
