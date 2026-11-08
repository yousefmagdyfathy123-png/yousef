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
  Object.assign(v,{TabbCount:1,TabbQty:1,SubTab:'Flhb1a',MinMainSize:4,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,WeightSign:imperial?'lb':'kg'});
  const path=`Flhb/Flhb1${v.Sch}.csv`,count=loadBank(state,catalog,1,path,3,4,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...apply(state,catalog).trace);}
  v.ChkType='U_S_Z';
  const view=flanView(state,count,['MainSize','Sch'],20932,{Sch:['5s','5','10s','10','20','30','40s','80s','XS','100','140']},4),a=(col:number)=>flanCell(state,col),row=Number(v.MainSize);
  if(['','N/A'].includes(a(3)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-schedule',state),trace,evidenceIds:['route:Flhb1']};
  try{
    const wt=vbString(vbRound(vbVal(a(11))*Number(v.WeightFactor),2),state.culture);
    for(const [column,text] of [[30,'Seal Ring'],[31,'Butt Welded Hub'],[32,'37.5*'],[33,'Blind Hub'],[34,'Nozzle']] as const)writeCell(state.legacyBuffers,1,row,column,text);
    view.headers=[String(v.DN)+a(Number(v.ListCol))+v.ListUnitsSign+v.NPS+' '+v.Title+'  Sch-'+v.Sch,'Connection Weight =  '+wt+' '+v.WeightSign,'','','',a(10)+' Studbolts Supplied with Connector',String(v.ActivitySpecLong)];
    view.textResults={status:'available',rows:[{id:'connection-weight',label:'Connection Weight =  ',value:wt,unit:String(v.WeightSign)}]};
  }catch(error){return recoverRecipeError(state,catalog,error,'Flhb1Headers');}
  view.drawing=buildDisplayList(state,catalog.template('Flhb/Flhb1.dxf'),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:Flhb1']};
}
export const Flhb1:FeatureRoute={id:'Flhb1',apply(state,_action,catalog){try{return apply(state,catalog);}catch(error){return recoverRecipeError(state,catalog,error);}}};
