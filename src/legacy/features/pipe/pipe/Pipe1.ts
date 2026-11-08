import type { FeatureRoute,WorkState,Catalog,WorkResult,TraceEvent } from '../../../contracts';
import { loadBank } from '../../banks';
import { cell,recipeView } from '../../recipe-view';
import { writeCell } from '../../../state/buffers';
import { saveSettings,loadSettings } from '../../../state/settings';
import { unavailableView } from '../../../state/errors';
import { buildDisplayList } from '../../../drawing/display-list';
import { recoverRecipeError } from '../../recover';
import { vbRound,vbVal } from '../../../vb/numbers';
import { vbString } from '../../../vb/strings';
function apply(state:WorkState,catalog:Catalog):WorkResult{
  const v=state.values,imperial=v.Units==='Imperial',trace:TraceEvent[]=[];
  Object.assign(v,{TabbCount:1,TabbQty:1,SubTab:'Pipe1a',MinMainSize:2,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,WeightSign:imperial?'lb/ft':'kg/m'});
  const count=loadBank(state,catalog,1,`Pipe/Pipe${imperial?'_Imperial_':''}${v.Sch}.csv`,4,2,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...apply(state,catalog).trace);}
  v.ChkType='U_S_Z';
  const view=recipeView(state,count,['MainSize','Sch'],28090),a=(col:number)=>cell(state,col);
  if(['','N/A'].includes(a(4)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-schedule',state),trace,evidenceIds:['route:Pipe1']};
  view.headers=[String(v.DN)+a(Number(v.ListCol))+v.ListUnitsSign+v.NPS+'  Sch-'+v.Sch+' '+v.Title,'Weight =  '+a(7)+' '+v.WeightSign,'Weight full with water =  '+a(8)+' '+v.WeightSign,'','','',String(v.ActivitySpecLong)];
  writeCell(state.legacyBuffers,1,Number(v.MainSize),5,vbString(vbRound(vbVal(a(5)),imperial?4:2),state.culture));
  view.drawing=buildDisplayList(state,catalog.template('Pipe/Pipe1.dxf'),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:Pipe1']};
}
export const Pipe1:FeatureRoute={id:'Pipe1',apply(state,_action,catalog){try{return apply(state,catalog);}catch(error){return recoverRecipeError(state,catalog,error);}}};
