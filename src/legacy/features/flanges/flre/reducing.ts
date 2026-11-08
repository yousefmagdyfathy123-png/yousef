import type { WorkState,Catalog,TraceEvent,WorkResult } from '../../../contracts';
import { loadBank } from '../../banks';
import { flanCell,flanView } from '../flan';
import { saveSettings,loadSettings } from '../../../state/settings';
import { readCell,writeCell } from '../../../state/buffers';
import { unavailableView } from '../../../state/errors';
import { buildDisplayList } from '../../../drawing/display-list';
import { vbVal } from '../../../vb/numbers';
import { vbString,vbTrim } from '../../../vb/strings';
// Source reducing flange handlers share sizing/headers; tab2 keeps prior ChkType.
export function applyReducing(state:WorkState,catalog:Catalog,tab:1|2,line:number):WorkResult{
  const route='Flre'+tab;
  const v=state.values,trace:TraceEvent[]=[],imperial=v.Units==='Imperial';
  Object.assign(v,{TabbCount:tab,TabbQty:2,SubTab:route+'a',MinMainSize:5,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,WeightSign:imperial?'lb':'kg'});
  if(tab===1)Object.assign(v,{SubSubTab:route+'b',SubSubSubTab:route+'c'});
  const path=`Flan/${imperial?'Flg_Imperial_':'Flg'}${String(v.ASMEClass).slice(0,-1)}.csv`;
  const count=loadBank(state,catalog,1,path,3,5,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...applyReducing(state,catalog,tab,line).trace);}
  const row=Number(v.MainSize);
  v.FlreSmallSize??=0;
  for(const [lo,hi,limit] of [[7,9,4],[10,10,6],[11,12,7],[13,15,8],[16,16,10],[17,17,11],[18,20,12],[21,25,13]])if(row>=lo&&row<=hi)v.FlreSmallSize=limit;
  // DesigBtn2 clamps the current selection without saving it to family settings.
  Object.assign(v,{LowerLimit:4,HigherLimit:row-1,SmallSize:Math.max(4,Math.min(Number(v.SmallSize),row-1))});
  if(tab===1)v.ChkType='U_C_Z_M';
  const small=Number(v.SmallSize),col=Number(v.ListCol),sign=String(v.ListUnitsSign),a=(column:number,r=row)=>readCell(state.legacyBuffers,1,r,column)??'';
  const view=flanView(state,count,['MainSize','ASMEClass'],line);
  const smallControl={...view.controls[1],id:'SmallSize',sourceId:'Btn2',text:a(col,small)+sign,options:Array.from({length:row-4},(_,i)=>({value:String(i+4),text:a(col,i+4)+sign,enabled:true}))};
  view.controls[1].sourceId='Btn3';view.controls[1].layout.x=510;
  smallControl.layout={x:430,y:56,width:80,height:33};view.controls.splice(1,0,smallControl);
  if(['','N/A'].includes(flanCell(state,3)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-class-face',state),trace,evidenceIds:['route:'+route]};
  const numeric=(column:number,r=row)=>vbString(vbVal(vbTrim(a(column,r))),state.culture);
  for(const [column,text] of [[48,a(20)+' Holes'],[49,a(25)+'" Dia'],[60,numeric(6,small)],[61,numeric(5,small)],[62,'Threaded reducing flange'],[63,tab===1?'Tapped blind flange':'Drilled blind flange'],[64,numeric(4)],[30,'2 x 0.5in NPT'],[31,'PCD'],[32,'Holes'],[33,'Dia'],[34,'23*']] as const)writeCell(state.legacyBuffers,1,row,column,text);
  view.headers=[String(v.DN)+a(col)+sign+' x '+a(col,small)+sign+v.NPS+' '+v.Title+' '+v.ASMEClass+' '+v.Face,'','','','','',String(v.ActivitySpecLong)];
  let drawing=route;
  if(tab===1&&v.ASMEClass==='150#')drawing=small<=Number(v.FlreSmallSize)?route+'c':route+'b';
  else if(small<=Number(v.FlreSmallSize))drawing=route+'a';
  view.drawing=buildDisplayList(state,catalog.template('Flre/'+drawing+'.dxf'),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:'+route]};
}
