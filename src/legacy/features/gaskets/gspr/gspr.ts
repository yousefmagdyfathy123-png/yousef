import type { WorkState,Catalog,TraceEvent,WorkResult } from '../../../contracts';
import { loadBank } from '../../banks';
import { flanCell,flanView } from '../../flanges/flan';
import { saveSettings,loadSettings } from '../../../state/settings';
import { writeCell } from '../../../state/buffers';
import { unavailableView } from '../../../state/errors';
import { buildDisplayList } from '../../../drawing/display-list';
import { vbVal,vbRound } from '../../../vb/numbers';
import { vbString } from '../../../vb/strings';
export function applyGspr(state:WorkState,catalog:Catalog,n:1|2|3,line:number):WorkResult{
  const v=state.values,trace:TraceEvent[]=[],imperial=v.Units==='Imperial',index=Number(v.ASMEClassIndex);
  Object.assign(v,{TabbCount:n,TabbQty:3,SubTab:`Gspr${n}a`,MinMainSize:3,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,WeightSign:imperial?'lb':'kg'});
  const count=loadBank(state,catalog,1,`Gspr/Gspr${n}`+(imperial?'_Imperial':'')+'.csv',(n===1?2+index:22+index),3,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...applyGspr(state,catalog,n,line).trace);}
  v.ChkType='U_C_Z';
  const view=flanView(state,count,['MainSize','ASMEClass'],line,{ASMEClass:n===1?[]:['1500#','2500#']},3),a=(col:number)=>flanCell(state,col),row=Number(v.MainSize);
  if(['','N/A'].includes(a((n===1?2+index:22+index))))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-class-face',state),trace,evidenceIds:[`route:Gspr${n}`]};
  const wt=vbString(vbRound(vbVal(a((n===1?25+index:22+index)))*Number(v.WeightFactor),2),state.culture);
  const columns=n===1?[2+index,9+index,index<5?17:18,18+index]:[4*index-1,4*index,4*index+1,4*index+2];
  columns.forEach((col,i)=>writeCell(state.legacyBuffers,1,row,34+i,vbString(vbRound(vbVal(a(col)),2),state.culture)));
  writeCell(state.legacyBuffers,1,row,38,'Compressed');
  view.headers=[String(v.DN)+a(Number(v.ListCol))+v.ListUnitsSign+v.NPS+' '+v.Title+' '+v.ASMEClass+' '+v.Face,'Weight =  '+wt+' '+v.WeightSign,'','','','',String(v.ActivitySpecLong)];
  view.textResults={status:'available',rows:[{id:'weight',label:'Weight =  ',value:wt,unit:String(v.WeightSign)}]};
  view.drawing=buildDisplayList(state,catalog.template(`Gspr/Gspr${n}.dxf`),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:[`route:Gspr${n}`]};
}
