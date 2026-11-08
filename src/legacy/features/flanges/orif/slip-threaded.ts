import type { WorkState,Catalog,TraceEvent,WorkResult } from '../../../contracts';
import { loadBank } from '../../banks';
import { flanCell,flanView } from '../flan';
import { saveSettings,loadSettings } from '../../../state/settings';
import { writeCell } from '../../../state/buffers';
import { unavailableView } from '../../../state/errors';
import { buildDisplayList } from '../../../drawing/display-list';
import { vbVal,vbRound } from '../../../vb/numbers';
import { vbString } from '../../../vb/strings';
// Orif2/3 share headers; source Orif3 deliberately retains the prior ChkType.
export function applySlipThreaded(state:WorkState,catalog:Catalog,tab:2|3,line:number):WorkResult{
  const route='Orif'+tab;
  const v=state.values,trace:TraceEvent[]=[],fi=Number(v.FaceIndex),imperial=v.Units==='Imperial';
  Object.assign(v,{TabbCount:tab,TabbQty:3,SubTab:route+'a',MinMainSize:3,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,WeightSign:imperial?'lb':'kg'});
  const path=`Orif/${imperial?'Orif_Imperial_':'Orif'}${String(v.ASMEClass).slice(0,-1)}.csv`;
  const count=loadBank(state,catalog,1,path,3,3,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...applySlipThreaded(state,catalog,tab,line).trace);}
  if(tab===2)v.ChkType='U_C_Z';
  const view=flanView(state,count,['MainSize','ASMEClass'],line,{ASMEClass:['150#','400#','600#','900#','1500#','2500#']},3),a=(col:number)=>flanCell(state,col),row=Number(v.MainSize);
  if(['','N/A'].includes(a(3)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-class',state),trace,evidenceIds:['route:'+route]};
  const format=(column:number)=>vbString(vbRound(vbVal(a(column))*Number(v.WeightFactor),2),state.culture);
  const wt=format(27),bolts=format(39+fi);
  for(const [col,text] of [[30,'1/2" NPT (TYP)'],[31,'PCD'],[32,'Holes'],[33,'Dia'],[34,'23*'],[35,a(20)+' Holes'],[36,a(25)+'" Dia']] as const)writeCell(state.legacyBuffers,1,row,col,text);
  view.headers=[String(v.DN)+a(Number(v.ListCol))+v.ListUnitsSign+v.NPS+' '+v.Title+' '+v.ASMEClass+' '+v.Face,'Flange Wt =  '+wt+' '+v.WeightSign,'S/Bolts and Nuts =  '+bolts+' '+v.WeightSign,'','','StudBolt Size : '+a(21)+'" UNC  (or M'+a(26)+')  x '+a(22+fi)+v.Inchsign+' Long, plus orifice plate thickness',String(v.ActivitySpecLong)];
  view.textResults={status:'available',rows:[{id:'flange-weight',label:'Flange Wt =  ',value:wt,unit:String(v.WeightSign)},{id:'bolts-weight',label:'S/Bolts and Nuts =  ',value:bolts,unit:String(v.WeightSign)}]};
  view.drawing=buildDisplayList(state,catalog.template('Orif/'+(v.Face==='RTJ'?v.SubTab:route)+'.dxf'),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:'+route]};
}
