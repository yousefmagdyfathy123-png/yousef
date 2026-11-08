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
  const v=state.values,trace:TraceEvent[]=[],imperial=v.Units==='Imperial';
  Object.assign(v,{TabbCount:1,TabbQty:1,SubTab:'Flbs1a',MinMainSize:3,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,DimFactor:imperial?25.4:1,WeightSign:imperial?'lb':'kg'});
  const path=`Flbs/Fla${v.Table}.csv`,count=loadBank(state,catalog,1,path,3,3,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...apply(state,catalog).trace);}
  v.ChkType='U_T_Z';
  const view=flanView(state,count,['MainSize','Table'],21006,{},3),a=(col:number)=>flanCell(state,col),row=Number(v.MainSize);
  view.controls[1].text='Table '+v.Table;view.controls[1].options=view.controls[1].options.map(o=>({...o,text:'Table '+o.value}));
  if(['','N/A'].includes(a(3)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-class-face',state),trace,evidenceIds:['route:Flbs1']};
  const weight=(column:number)=>vbString(vbRound(vbVal(a(column))*Number(v.WeightFactor),2),state.culture),wt=weight(12),bolts=weight(13);
  writeCell(state.legacyBuffers,1,row,60,a(9)+' Holes');writeCell(state.legacyBuffers,1,row,61,a(15)+'" Dia');
  const raw=vbString(vbRound(vbVal(a(22))/Number(v.DimFactor)*100,0)/100,state.culture),length=vbString(vbRound(vbVal(raw),2),state.culture);
  view.headers=[String(v.DN)+a(Number(v.ListCol))+v.ListUnitsSign+v.NPS+' BS 10 Flange Table '+v.Table,'Flange Wt =  '+wt+' '+v.WeightSign,'S/Bolts and Nuts =  '+bolts+' '+v.WeightSign,'BS 10 primary units are inch fractions','metric and inch conversions are rounded to two decimal places.','StudBolt Size : '+a(10)+'" UNC  (or M'+a(11)+')  x '+length+v.Inchsign+' Long',String(v.ActivitySpecLong)];
  view.textResults={status:'available',rows:[{id:'flange-weight',label:'Flange Wt =  ',value:wt,unit:String(v.WeightSign)},{id:'bolts-weight',label:'S/Bolts and Nuts =  ',value:bolts,unit:String(v.WeightSign)}]};
  view.drawing=buildDisplayList(state,catalog.template('Flbs/Flbs1'+(['H','J','K','R','S','T'].includes(String(v.Table))?'a':'')+'.dxf'),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:Flbs1']};
}
export const Flbs1:FeatureRoute={id:'Flbs1',apply(state,_action,catalog){try{return apply(state,catalog);}catch(error){return recoverRecipeError(state,catalog,error);}}};
