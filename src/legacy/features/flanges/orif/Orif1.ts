import type { FeatureRoute,WorkState,Catalog,TraceEvent,WorkResult } from '../../../contracts';
import { loadBank } from '../../banks';
import { flanCell,flanView } from '../flan';
import { saveSettings,loadSettings } from '../../../state/settings';
import { writeCell } from '../../../state/buffers';
import { unavailableView } from '../../../state/errors';
import { buildDisplayList } from '../../../drawing/display-list';
import { recoverRecipeError } from '../../recover';
import { vbVal,vbRound } from '../../../vb/numbers';
import { vbString } from '../../../vb/strings';
function apply(state:WorkState,catalog:Catalog):WorkResult{
  const v=state.values,trace:TraceEvent[]=[],fi=Number(v.FaceIndex),imperial=v.Units==='Imperial';
  Object.assign(v,{TabbCount:1,TabbQty:3,SubTab:'Orif1a',MinMainSize:3,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,WeightSign:imperial?'lb':'kg'});
  const path=`Orif/${imperial?'Orif_Imperial_':'Orif'}${String(v.ASMEClass).slice(0,-1)}.csv`;
  const count=loadBank(state,catalog,1,path,3,3,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...apply(state,catalog).trace);}
  v.ChkType='U_F_C_Z';if(v.ASMEClass==='300#')v.SubTab='Orif1';
  const view=flanView(state,count,['MainSize','ASMEClass','Face'],20000,{ASMEClass:['150#','400#']},3),a=(col:number)=>flanCell(state,col),row=Number(v.MainSize);
  if(v.ASMEClass==='300#')view.controls[2].visible=false;
  if(['','N/A'].includes(a(3)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-class',state),trace,evidenceIds:['route:Orif1']};
  const format=(column:number)=>vbString(vbRound(vbVal(a(column))*Number(v.WeightFactor),2),state.culture);
  const wt=format(27),bolts=format(39+fi);
  for(const [col,text] of [[30,'1/2" NPT (TYP)'],[31,'PCD'],[34,'23*'],[20,a(20)+' Holes'],[25,a(25)+'" Dia']] as const)writeCell(state.legacyBuffers,1,row,col,text);
  view.headers=[String(v.DN)+a(Number(v.ListCol))+v.ListUnitsSign+v.NPS+' '+v.Title+' '+v.ASMEClass+' '+v.Face,'Flange Wt =  '+wt+' '+v.WeightSign,'S/Bolts and Nuts =  '+bolts+' '+v.WeightSign,v.Face==='RTJ'?'RTJ Ring No : '+a(15):'',v.Face==='RTJ'?'RTJ Distance Between Flgs : '+vbString(vbVal(a(16))*2,state.culture)+v.Inchsign+', plus orifice plate thickness':'','StudBolt Size : '+a(21)+'" UNC  (or M'+a(26)+')  x '+a(22+fi)+v.Inchsign+' Long, plus orifice plate thickness',String(v.ActivitySpecLong)];
  view.textResults={status:'available',rows:[{id:'flange-weight',label:'Flange Wt =  ',value:wt,unit:String(v.WeightSign)},{id:'bolts-weight',label:'S/Bolts and Nuts =  ',value:bolts,unit:String(v.WeightSign)}]};
  view.drawing=buildDisplayList(state,catalog.template('Orif/'+(v.Face==='RTJ'?v.SubTab:'Orif1')+'.dxf'),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:Orif1']};
}
export const Orif1:FeatureRoute={id:'Orif1',apply(state,_action,catalog){try{return apply(state,catalog);}catch(error){return recoverRecipeError(state,catalog,error);}}};
