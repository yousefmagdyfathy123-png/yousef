import type { WorkState,Catalog,TraceEvent,WorkResult } from '../../../contracts';
import { loadBank } from '../../banks';
import { flanCell,flanView } from '../../flanges/flan';
import { saveSettings,loadSettings } from '../../../state/settings';
import { readCell,writeCell } from '../../../state/buffers';
import { unavailableView } from '../../../state/errors';
import { buildDisplayList } from '../../../drawing/display-list';
import { vbVal,vbRound } from '../../../vb/numbers';
import { vbString } from '../../../vb/strings';
export function applyGrtj(state:WorkState,catalog:Catalog,n:1|2,line:number):WorkResult{
  const v=state.values,trace:TraceEvent[]=[],imperial=v.Units==='Imperial';
  Object.assign(v,{TabbCount:n,TabbQty:3,SubTab:`Grtj${n}a`,MinMainSize:3,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,WeightSign:imperial?'lb':'kg'});
  const count=loadBank(state,catalog,1,`Grtj/Grtj${n}`+(imperial?'_Imperial':'')+'.csv',3,3,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...applyGrtj(state,catalog,n,line).trace);}
  v.ChkType='U_Z';
  const view=flanView(state,count,['MainSize'],line,{},3),a=(col:number)=>flanCell(state,col),row=Number(v.MainSize);
  view.controls[0].text=a(Number(v.ListCol));view.controls[0].options=view.controls[0].options.map(o=>({...o,text:flanCellAt(state,Number(o.value),Number(v.ListCol))}));
  if(['','N/A'].includes(a(3)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-class-face',state),trace,evidenceIds:[`route:Grtj${n}`]};
  const wt=vbString(vbRound(vbVal(a(n===1?9:10))*Number(v.WeightFactor),2),state.culture);
  const radius=n===1?8:9;writeCell(state.legacyBuffers,1,row,radius,a(radius)+v.Inchsign+' Rad');
  const annotations=n===1?[[10,'Rad'],[11,'23*'],[12,'Octagonal Type'],[13,'Oval Type']] as const:[[12,'23*'],[13,'ID'],[14,'OD']] as const;
  for(const [col,text] of annotations)writeCell(state.legacyBuffers,1,row,col,text);
  view.headers=[v.Title+' '+a(1),'Weight =  '+wt+' '+v.WeightSign,'','','','',String(v.ActivitySpecLong)];
  view.textResults={status:'available',rows:[{id:'weight',label:'Weight =  ',value:wt,unit:String(v.WeightSign)}]};
  view.drawing=buildDisplayList(state,catalog.template(`Grtj/Grtj${n}.dxf`),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:[`route:Grtj${n}`]};
}
function flanCellAt(state:WorkState,row:number,col:number):string{return readCell(state.legacyBuffers,1,row,col)??'';}
