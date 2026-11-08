import type { WorkState,Catalog,TraceEvent,WorkResult } from '../../../contracts';
import { loadBank } from '../../banks';
import { flanCell,flanView } from '../flan';
import { saveSettings,loadSettings } from '../../../state/settings';
import { writeCell } from '../../../state/buffers';
import { unavailableView } from '../../../state/errors';
import { buildDisplayList } from '../../../drawing/display-list';
import { vbDouble,vbVal,vbRound } from '../../../vb/numbers';
import { vbString } from '../../../vb/strings';
// Source Series B handlers differ only in tab, source line, weight and drawing.
export function applySeriesB(state:WorkState,catalog:Catalog,tab:1|2,line:number,weightColumn:16|17):WorkResult{
  const route='Flap'+tab;
  const v=state.values,trace:TraceEvent[]=[],fi=Number(v.FaceIndex),imperial=v.Units==='Imperial';
  Object.assign(v,{TabbCount:tab,TabbQty:2,SubTab:route+'a',MinMainSize:3,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,WeightSign:imperial?'lb':'kg',ChkType:'U_C_Z'});
  const path=`Flap/${imperial?'FlgAp_Imperial_':'FlgAp'}${String(v.ASMEClass).slice(0,-1)}.csv`;
  const count=loadBank(state,catalog,1,path,11+fi,3,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...applySeriesB(state,catalog,tab,line,weightColumn).trace);}
  const view=flanView(state,count,['MainSize','ASMEClass'],line,{ASMEClass:['1500#','2500#']},3),a=(col:number)=>flanCell(state,col);
  if(['','N/A'].includes(a(11+fi)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-class-face',state),trace,evidenceIds:['route:'+route]};
  const format=(value:number)=>vbString(vbRound(vbRound(value*Number(v.WeightFactor)/5,0)*5,2),state.culture);
  const wt=format(vbDouble(a(weightColumn),state.culture)),bolts=format(vbVal(a(21))),row=Number(v.MainSize);
  writeCell(state.legacyBuffers,1,row,19,a(7)+' Holes');writeCell(state.legacyBuffers,1,row,20,a(9)+'" Dia');
  view.headers=[String(v.DN)+a(Number(v.ListCol))+v.ListUnitsSign+v.NPS+' '+v.Title+' '+v.ASMEClass+' '+v.Face,'Flange Wt = '+wt+' '+v.WeightSign,'S/Bolts and Nuts = '+bolts+' '+v.WeightSign,'','','StudBolt Size : '+a(8)+'" UNC  (or M'+a(18)+')  x '+a(10)+v.Inchsign+' Long',String(v.ActivitySpecLong)];
  view.textResults={status:'available',rows:[{id:'flange-weight',label:'Flange Wt = ',value:wt,unit:String(v.WeightSign)},{id:'bolts-weight',label:'S/Bolts and Nuts = ',value:bolts,unit:String(v.WeightSign)}]};
  view.drawing=buildDisplayList(state,catalog.template('Flap/'+route+'.dxf'),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:'+route]};
}
