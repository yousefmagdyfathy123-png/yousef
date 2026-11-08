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
  Object.assign(v,{TabbCount:1,TabbQty:2,SubTab:'Flbx1a',MinMainSize:3,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,WeightSign:imperial?'lb':'kg'});
  const path=`Flbx/FlbxWN${v.APIRatingIndex}${imperial?'_Imperial':''}.csv`,count=loadBank(state,catalog,1,path,2,3,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...apply(state,catalog).trace);}
  v.ChkType='U_A_Z';
  const view=flanView(state,count,['MainSize','APIRatingIndex'],20309,{APIRatingIndex:['1','2','3']},3),a=(col:number)=>flanCell(state,col),row=Number(v.MainSize);
  const rating=view.controls[1].options.find(o=>o.value===String(v.APIRatingIndex))!.text;view.controls[1].text=rating;
  if(['','N/A'].includes(a(2)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-rating',state),trace,evidenceIds:['route:Flbx1']};
  const weight=(column:number)=>vbString(vbRound(vbVal(a(column))*Number(v.WeightFactor),2),state.culture),wt=weight(20),bolts=weight(22);
  for(const [column,text] of [[48,a(11)+' Holes'],[49,a(13)+v.Inchsign+' Dia'],[50,a(9)+v.Inchsign+' Min'],[53,'23*']] as const)writeCell(state.legacyBuffers,1,row,column,text);
  view.headers=[String(v.DN)+a(Number(v.ListCol))+v.ListUnitsSign+v.NPS+' '+v.Title+' '+rating,'Flange Wt =  '+wt+' '+v.WeightSign,'Studbolts and Nuts Wt =  '+bolts+' '+v.WeightSign,'RTJ Ring No : '+a(15),'RTJ Distance Between Flgs : 0','StudBolt Size : '+a(12)+'" UNC x '+a(14)+v.Inchsign+' Long',String(v.ActivitySpecLong)];
  view.textResults={status:'available',rows:[{id:'flange-weight',label:'Flange Wt =  ',value:wt,unit:String(v.WeightSign)},{id:'bolts-weight',label:'Studbolts and Nuts Wt =  ',value:bolts,unit:String(v.WeightSign)}]};
  view.drawing=buildDisplayList(state,catalog.template('Flbx/Flbx1.dxf'),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:Flbx1']};
}
export const Flbx1:FeatureRoute={id:'Flbx1',apply(state,_action,catalog){try{return apply(state,catalog);}catch(error){return recoverRecipeError(state,catalog,error);}}};
