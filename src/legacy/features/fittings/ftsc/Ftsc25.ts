import { forgedRoute } from '../forged';
export const Ftsc25=forgedRoute({
  "id": "Ftsc25",
  "minimum": 3,
  "sensor": 2,
  "line": 25279,
  "weight": null,
  "disabled": [],
  file(rating,imperial){return 'Ftsc25'+(imperial?'_Inches':'_Millimetres');}
});
