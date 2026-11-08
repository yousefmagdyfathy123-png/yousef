import type { FeatureRoute,WorkState,Catalog,TraceEvent,WorkResult } from '../../../contracts';
import { loadBank } from '../../banks';
import { flanBase,flanCell,flanView,flanTabularHeaders } from '../flan';
import { saveSettings } from '../../../state/settings';
import { unavailableView } from '../../../state/errors';
import { buildDisplayList } from '../../../drawing/display-list';
import { recoverRecipeError } from '../../recover';
function apply(state:WorkState,catalog:Catalog):WorkResult{
  flanBase(state,3,'Flan3a','U_F_C_Z');const v=state.values,trace:TraceEvent[]=[];
  const sensor=11+Number(v.FaceIndex),file=`Flan/${v.Units==='Imperial'?'FLG_Imperial_':'Flg'}${String(v.ASMEClass).slice(0,-1)}.csv`;
  const count=loadBank(state,catalog,1,file,sensor,5,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);return apply(state,catalog);}
  const view=flanView(state,count,['MainSize','ASMEClass','Face'],19436);
  if(['','N/A'].includes(flanCell(state,sensor)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-class-face',state),trace,evidenceIds:['route:Flan3']};
  flanTabularHeaders(state,view,29);
  view.drawing=buildDisplayList(state,catalog.template(v.Face==='RTJ'?'Flan/Flan3a.dxf':'Flan/Flan3.dxf'),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:Flan3']};
}
export const Flan3:FeatureRoute={id:'Flan3',apply(state,_action,catalog){try{return apply(state,catalog);}catch(error){return recoverRecipeError(state,catalog,error);}}};
