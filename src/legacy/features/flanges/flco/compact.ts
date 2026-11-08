import type { WorkState,Catalog,TraceEvent,WorkResult } from '../../../contracts';
import { loadBank } from '../../banks';
import { flanCell,flanView } from '../flan';
import { saveSettings,loadSettings } from '../../../state/settings';
import { unavailableView } from '../../../state/errors';
import { buildDisplayList } from '../../../drawing/display-list';
import { vbVal,vbRound } from '../../../vb/numbers';
import { vbString } from '../../../vb/strings';
// Proven compact header flow; blind weight and swivel eligibility differ.
export function applyCompact(state:WorkState,catalog:Catalog,tab:1|2|3,line:number):WorkResult{
  const route='Flco'+tab;
  const v=state.values,trace:TraceEvent[]=[],imperial=v.Units==='Imperial';
  const minimum=tab===2&&!['1500#','2500#'].includes(String(v.ASMEClass))?5:4,sensor=tab===2?11:2;
  Object.assign(v,{TabbCount:tab,TabbQty:3,SubTab:route+'a',MinMainSize:minimum,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,DimFactor:imperial?25.4:1,WeightSign:imperial?'lb':'kg'});
  const path=`Flco/FlcFlg${String(v.ASMEClass).slice(0,-1)}.csv`,count=loadBank(state,catalog,1,path,sensor,minimum,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...applyCompact(state,catalog,tab,line).trace);}
  if(tab===2&&Number(v.MainSize)<minimum){v.MainSize=minimum;saveSettings(state);loadSettings(state);trace.push(...applyCompact(state,catalog,tab,line).trace);}
  v.ChkType='U_C_Z';
  const view=flanView(state,count,['MainSize','ASMEClass'],line,{ASMEClass:['150#','400#']},minimum),a=(col:number)=>flanCell(state,col);
  if(['','N/A'].includes(a(sensor)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-rating',state),trace,evidenceIds:['route:'+route]};
  const wt=vbString(vbRound(vbVal(a(tab===3?5:4))*Number(v.WeightFactor),2),state.culture);
  const raw=vbString(vbRound(vbVal(a(15))/Number(v.DimFactor)*100,0)/100,state.culture),bolt=vbString(vbRound(vbVal(raw),2),state.culture);
  view.headers=[String(v.DN)+a(Number(v.ListCol))+v.ListUnitsSign+v.NPS+' '+v.Title+' '+v.ASMEClass,'Flange Wt =  '+wt+' '+v.WeightSign,'Weight is for a pair of flanges with bolting and joints.','','','StudBolts :  Qty '+a(13)+' - '+a(14)+'" UNC  (or M'+a(17)+')  x '+bolt+v.Inchsign+' Long','DESTEC'];
  view.textResults={status:'available',rows:[{id:'flange-weight',label:'Flange Wt =  ',value:wt,unit:String(v.WeightSign)}]};
  view.drawing=buildDisplayList(state,catalog.template('Flco/'+route+'.dxf'),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:'+route]};
}
