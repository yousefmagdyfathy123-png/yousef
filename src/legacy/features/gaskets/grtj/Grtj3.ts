import type { FeatureRoute } from '../../../contracts';
import { recoverRecipeError } from '../../recover';
import type { WorkState,Catalog,TraceEvent,WorkResult } from '../../../contracts';
import { loadBank } from '../../banks';
import { flanCell,flanView } from '../../flanges/flan';
import { saveSettings,loadSettings } from '../../../state/settings';
import { readCell,writeCell } from '../../../state/buffers';
import { unavailableView } from '../../../state/errors';
import { buildDisplayList } from '../../../drawing/display-list';
import { vbVal,vbRound } from '../../../vb/numbers';
import { vbString } from '../../../vb/strings';
function applyGrtj(state:WorkState,catalog:Catalog,n:1|2|3,line:number):WorkResult{
  const v=state.values,trace:TraceEvent[]=[],imperial=v.Units==='Imperial',index=Number(v.ASMEClassIndex);
  Object.assign(v,{TabbCount:n,TabbQty:3,SubTab:`Grtj${n}a`,MinMainSize:4,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,WeightSign:imperial?'lb':'kg'});
  const count=loadBank(state,catalog,1,`Grtj/Grtj${n}`+(imperial?'_Imperial':'')+'.csv',2,4,trace);
  loadBank(state,catalog,2,'Grtj/Grtj3.csv',2,4,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...applyGrtj(state,catalog,n,line).trace);}
  v.ChkType='U_Z';
  const view=flanView(state,count,['MainSize'],line,{},4),a=(col:number)=>flanCell(state,col),row=Number(v.MainSize);
  view.controls[0].text=a(Number(v.ListCol));view.controls[0].options=view.controls[0].options.map(o=>({...o,text:flanCellAt(state,Number(o.value),Number(v.ListCol))}));
  if(['','N/A'].includes(a(2)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-class-face',state),trace,evidenceIds:[`route:Grtj${n}`]};
  const metric=(col:number)=>vbVal(flanCell(state,col,2));
  // Each assignment and arithmetic operation below retains the source Single boundary.
  v.dia=Math.fround(metric(3));v.Length=Math.fround(metric(5));
  const cylinder=()=>Math.fround(3.14*Math.pow(Number(v.dia),2)/4*Number(v.Length)*7.8/1000000);
  v.Weight=cylinder();v.Cyl1Wt=v.Weight;
  v.dia=Math.fround(metric(4));v.Length=Math.fround(metric(5));v.Weight=cylinder();v.Hole1Wt=v.Weight;
  v.Weight=Math.fround(Number(v.Cyl1Wt)-Number(v.Hole1Wt));
  v.Weightt=vbString(vbRound(Math.fround(Number(v.Weight)*100),0)/100,state.culture).replace(/^(-?)0\./,'$1.');
  const wt=vbString(vbRound(vbVal(String(v.Weightt))*Number(v.WeightFactor),2),state.culture);
  writeCell(state.legacyBuffers,1,row,12,a(9)+v.Inchsign+' Rad');writeCell(state.legacyBuffers,1,row,13,'23*');v.A=a(9);
  writeCell(state.legacyBuffers,1,row,14,a(8)+v.Inchsign+' Dia hole');
  view.headers=[v.Title+' '+a(1),'Weight =  '+wt+' '+v.WeightSign,'','','','',String(v.ActivitySpecLong)];
  view.textResults={status:'available',rows:[{id:'weight',label:'Weight =  ',value:wt,unit:String(v.WeightSign)}]};
  view.drawing=buildDisplayList(state,catalog.template(`Grtj/Grtj${n}.dxf`),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:[`route:Grtj${n}`]};
}
function flanCellAt(state:WorkState,row:number,col:number):string{return readCell(state.legacyBuffers,1,row,col)??'';}
export const Grtj3:FeatureRoute={id:'Grtj3',apply(state,_action,catalog){try{return applyGrtj(state,catalog,3,21759);}catch(error){return recoverRecipeError(state,catalog,error);}}};
