import type { FeatureRoute,WorkState,Catalog,TraceEvent,WorkResult } from '../../../contracts';
import { loadBank } from '../../banks';
import { flanBase,flanCell,flanView,flanTabularHeaders } from '../flan';
import { saveSettings } from '../../../state/settings';
import { unavailableView } from '../../../state/errors';
import { buildDisplayList } from '../../../drawing/display-list';
import { recoverRecipeError } from '../../recover';
import { vbDouble,vbVal,vbRound } from '../../../vb/numbers';
import { vbString } from '../../../vb/strings';
function apply(state:WorkState,catalog:Catalog):WorkResult{
  flanBase(state,6,'Flan6','U_C_S_Z');const v=state.values,trace:TraceEvent[]=[],imperial=v.Units==='Imperial',sensor=12+Number(v.FaceIndex);
  const count=loadBank(state,catalog,1,`Flan/${imperial?'FLG_Imperial_':'Flg'}${String(v.ASMEClass).slice(0,-1)}.csv`,sensor,5,trace);
  loadBank(state,catalog,2,`Pipe/${imperial?'Pipe_Imperial_':'Pipe'}${String(v.Sch)}.csv`,4,5,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);return apply(state,catalog);}
  const disabled=['5','10','20','30','STD','40','60','80s','XS','80','100','120','140','160','XXS'];
  const view=flanView(state,count,['MainSize','ASMEClass','Sch'],19608,{Sch:disabled});
  if(['','N/A'].includes(flanCell(state,sensor)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-class',state),trace,evidenceIds:['route:Flan6']};
  // Source shares the tabular weight/bolting/drilling operations, but this
  // lapped recipe has a schedule heading, no RTJ text and a wall-based length.
  flanTabularHeaders(state,view,28);
  const a=(col:number)=>flanCell(state,col);
  view.headers[0]=String(v.DN)+a(Number(v.ListCol))+v.ListUnitsSign+v.NPS+' '+v.Title+' '+v.ASMEClass+'  Sch-'+v.Sch;
  view.headers[3]='';view.headers[4]='';
  v.AnyInt=vbVal(flanCell(state,4,2))*2;
  const text=a(23).replaceAll('+1/4','.25').replaceAll('+1/2','.5').replaceAll('+3/4','.75');
  const length=vbString(vbRound(vbDouble(text,state.culture)+Number(v.AnyInt),2),state.culture);
  view.headers[5]='StudBolt Size : '+a(21)+'" UNC  (or M'+a(26)+')  x '+length+v.Inchsign+' Long';
  view.drawing=buildDisplayList(state,catalog.template('Flan/Flan6.dxf'),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:Flan6']};
}
export const Flan6:FeatureRoute={id:'Flan6',apply(state,_action,catalog){try{return apply(state,catalog);}catch(error){return recoverRecipeError(state,catalog,error);}}};
