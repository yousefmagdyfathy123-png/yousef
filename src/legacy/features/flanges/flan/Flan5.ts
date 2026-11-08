import type { FeatureRoute,WorkState,Catalog,TraceEvent,WorkResult } from '../../../contracts';
import { loadBank } from '../../banks';
import { flanBase,flanCell,flanView,flanTabularHeaders } from '../flan';
import { saveSettings } from '../../../state/settings';
import { unavailableView } from '../../../state/errors';
import { buildDisplayList } from '../../../drawing/display-list';
import { recoverRecipeError } from '../../recover';
function apply(state:WorkState,catalog:Catalog):WorkResult{
  flanBase(state,5,'Flan5a','U_F_C_Z');const v=state.values,trace:TraceEvent[]=[];
  const cls=String(v.ASMEClass).slice(0,-1),file=`Flan/${v.Units==='Imperial'?'FLG_Imperial_':'Flg'}${cls}.csv`;
  // Source retains this name even though this recipe does not load bank3.
  v.DataBaseName3='Flg'+cls;
  const count=loadBank(state,catalog,1,file,17,5,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);return apply(state,catalog);}
  const view=flanView(state,count,['MainSize','ASMEClass','Face'],19548,{ASMEClass:['400#','900#','2500#']});
  if(['','N/A'].includes(flanCell(state,17)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-class-face',state),trace,evidenceIds:['route:Flan5']};
  flanTabularHeaders(state,view,28);
  view.drawing=buildDisplayList(state,catalog.template(v.Face==='RTJ'?'Flan/Flan5a.dxf':'Flan/Flan5.dxf'),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:Flan5']};
}
export const Flan5:FeatureRoute={id:'Flan5',apply(state,_action,catalog){try{return apply(state,catalog);}catch(error){return recoverRecipeError(state,catalog,error);}}};
