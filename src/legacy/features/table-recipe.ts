import type { Catalog,FeatureRoute,LegacyView,TraceEvent,WorkResult,WorkState } from '../contracts';
import { loadBank } from './banks';
import { recipeView,cell } from './recipe-view';
import { loadSettings,saveSettings } from '../state/settings';
import { unavailableView } from '../state/errors';
import type { UnavailableKind } from '../state/errors';
import { recoverRecipeError } from './recover';
import { buildDisplayList } from '../drawing/display-list';
export interface TableRecipe {
  id:string;line:number;minimum:number;qty:number;subtab:string;chk:string;
  sensor:number|'face';fields:string[];disabled:string[];error:UnavailableKind|'nuts';
  subtabs?:{SubSubTab:string;SubSubSubTab:string};
  file(state:WorkState):string;
}
export type HeaderWriter=(state:WorkState,view:LegacyView)=>void;
export function tableRecipe(p:TableRecipe,headers:HeaderWriter,template:(s:WorkState)=>string=()=>p.id.slice(0,4)+'/'+p.id+'.dxf'):FeatureRoute {
  function apply(state:WorkState,catalog:Catalog):WorkResult {
    const v=state.values,trace:TraceEvent[]=[],sensor=p.sensor==='face'?2+Number(v.FaceIndex):p.sensor;
    Object.assign(v,{TabbCount:p.id.startsWith('Nuts')?1:Number(p.id.slice(4)),TabbQty:p.qty,SubTab:p.subtab,MinMainSize:p.minimum,DrawDatum:1030,ChkType:p.chk});
    if(p.subtabs)Object.assign(v,p.subtabs);
    if(p.id.startsWith('Srr')||p.id.startsWith('Nuts'))Object.assign(v,{LowerLimit:p.minimum,HigherLimit:v.MainSize});
    // Nuts deliberately retain LoadConfig's 2.2 weight factor and inch sign.
    if(!p.id.startsWith('Nuts'))Object.assign(v,{Inchsign:v.Units==='Imperial'?'"':'',WeightFactor:v.Units==='Imperial'?2.20462:1,WeightSign:v.Units==='Imperial'?'lb':'kg'});
    const count=loadBank(state,catalog,1,p.file(state),sensor,p.minimum,trace);
    if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...apply(state,catalog).trace);}
    const view=recipeView(state,count,p.fields,p.line,{ASMEClass:p.disabled});
    if(p.id==='Nuts1'){
      const control=view.controls[0];control.text=cell(state,Number(v.ListCol));
      control.options.forEach(o=>o.text=cell(state,Number(v.ListCol),1,Number(o.value)));
    }
    if(['','N/A'].includes(cell(state,sensor))){
      if(p.error!=='nuts')return {state,view:unavailableView(view,String(v.ActivityTitle),p.error,state),trace,evidenceIds:['route:'+p.id]};
      // ErrorMessageNuts has an empty body: preserve the previous cleared view.
      if(state.legacySession?.lastView){const old=state.legacySession.lastView;view.headers[6]=old.headers[6];view.drawing=structuredClone(old.drawing);}
      return {state,view,trace,evidenceIds:['route:'+p.id]};
    }
    headers(state,view);
    const drawingPath=template(state);
    try{view.drawing=buildDisplayList(state,catalog.template(drawingPath),catalog,{width:1067,height:690});}
    catch(error){return recoverRecipeError(state,catalog,error,drawingPath.split('/')[1].slice(0,-4));}
    return {state,view,trace,evidenceIds:['route:'+p.id]};
  }
  return {id:p.id,apply(state,_action,catalog){try{return apply(state,catalog);}catch(error){return recoverRecipeError(state,catalog,error);}}};
}
