import type { WorkState,Catalog,TraceEvent,WorkResult } from '../../../contracts';
import { loadBank } from '../../banks';
import { flanCell,flanView } from '../flan';
import { saveSettings,loadSettings } from '../../../state/settings';
import { writeCell } from '../../../state/buffers';
import { unavailableView } from '../../../state/errors';
import { buildDisplayList } from '../../../drawing/display-list';
import { vbVal,vbRound } from '../../../vb/numbers';
import { vbString } from '../../../vb/strings';
// API6B handlers share proven flow; eligibility/weight/max annotation differ.
export function applyType6B(state:WorkState,catalog:Catalog,tab:1|2,line:number):WorkResult{
  const route='Fl6b'+tab,sensor=tab===1?21:3;
  const v=state.values,trace:TraceEvent[]=[],imperial=v.Units==='Imperial';
  Object.assign(v,{TabbCount:tab,TabbQty:2,SubTab:route+'a',MinMainSize:3,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,WeightSign:imperial?'lb':'kg'});
  const path=`Fl6b/Fl6b${v.APIRatingIndex}${imperial?'_Imperial':''}.csv`,count=loadBank(state,catalog,1,path,sensor,3,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...applyType6B(state,catalog,tab,line).trace);}
  v.ChkType='U_A_Z';
  const view=flanView(state,count,['MainSize','APIRatingIndex'],line,{APIRatingIndex:['4','5','6']},3),a=(col:number)=>flanCell(state,col),row=Number(v.MainSize);
  const rating=view.controls[1].options.find(o=>o.value===String(v.APIRatingIndex))!.text;view.controls[1].text=rating;
  if(['','N/A'].includes(a(sensor)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-rating',state),trace,evidenceIds:['route:'+route]};
  const weight=(column:number)=>vbString(vbRound(vbVal(a(column))*Number(v.WeightFactor),2),state.culture),wt=weight(tab===1?38:39),bolts=weight(41);
  writeCell(state.legacyBuffers,1,row,26,'23*');
  for(const column of [30,31,42,43])writeCell(state.legacyBuffers,1,row,column,a(column)+v.Inchsign);
  for(const [column,text] of [[35,a(12)+' Holes'],[36,a(14)+v.Inchsign+' Dia'],[37,tab===1?a(24)+v.Inchsign+' Max':'Client Specify']] as const)writeCell(state.legacyBuffers,1,row,column,text);
  view.headers=[String(v.DN)+a(Number(v.ListCol))+v.ListUnitsSign+v.NPS+' '+v.Title+' '+rating,'Flange Wt =  '+wt+' '+v.WeightSign,'Studbolts and Nuts Wt =  '+bolts+' '+v.WeightSign,'RTJ Ring No : '+a(17),'RTJ Distance Between Flgs : '+a(27)+v.Inchsign+" (Ring type 'R'), or "+a(28)+v.Inchsign+" (Ring type 'RX')",'StudBolt Size : '+a(13)+'" UNC x '+a(34)+v.Inchsign+' Long',String(v.ActivitySpecLong)];
  view.textResults={status:'available',rows:[{id:'flange-weight',label:'Flange Wt =  ',value:wt,unit:String(v.WeightSign)},{id:'bolts-weight',label:'Studbolts and Nuts Wt =  ',value:bolts,unit:String(v.WeightSign)}]};
  view.drawing=buildDisplayList(state,catalog.template('Fl6b/'+route+'.dxf'),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:'+route]};
}
