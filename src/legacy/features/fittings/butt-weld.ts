import type { FeatureRoute,WorkState,Catalog,WorkResult,TraceEvent } from '../../contracts';
import { loadBank } from '../banks';
import { cell,recipeView,smallSizeLimits } from '../recipe-view';
import { writeCell } from '../../state/buffers';
import { saveSettings,loadSettings } from '../../state/settings';
import { unavailableView } from '../../state/errors';
import { buildDisplayList } from '../../drawing/display-list';
import { recoverRecipeError } from '../recover';
import { vbVal,vbRound } from '../../vb/numbers';
import { vbString } from '../../vb/strings';
export type ButtWeldRecipe={id:string;minimum:number;sensor:number;line:number;table:string;subtab:string};
function apply(state:WorkState,catalog:Catalog,p:ButtWeldRecipe):WorkResult{
  const n=Number(p.id.slice(4)),v=state.values,imperial=v.Units==='Imperial',trace:TraceEvent[]=[],minimum=p.minimum,sensor=p.sensor;
  Object.assign(v,{TabbCount:n,TabbQty:11,SubTab:p.subtab,MinMainSize:minimum,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,WeightSign:imperial?'lb':'kg'});
  if(n===8)v.SchMenuItemQty=17;
  const suffix=(imperial?'_Imperial_':'')+v.Sch+'.csv',count=loadBank(state,catalog,1,'Ftbw/'+p.table+suffix,sensor,minimum,trace);
  if([8,10,11].includes(n))loadBank(state,catalog,2,'Pipe/Pipe'+suffix,4,minimum,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...apply(state,catalog,p).trace);}
  const reducing=[7,9,10].includes(n);if(reducing)smallSizeLimits(state);
  v.ChkType=reducing?'U_S_Z_M':'U_S_Z';
  const disabled=n===11?['5','10','20','30','STD','40','60','80s','XS','80','100','120','140','160','XXS']:['5'];
  const view=recipeView(state,count,reducing?['MainSize','SmallSize','Sch']:['MainSize','Sch'],p.line,{Sch:disabled}),a=(col:number,bank=1,row=Number(v.MainSize))=>cell(state,col,bank,row),row=Number(v.MainSize),small=Number(v.SmallSize);
  if(['','N/A'].includes(a(sensor)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-schedule',state),trace,evidenceIds:[`route:Ftbw${n}`]};
  const format=(col:number)=>vbString(vbRound(vbVal(a(col))*Number(v.WeightFactor),2),state.culture);
  const weightColumn=[6,6,7,6,7,6,small+41,9,small+41,small+41,12][n-1];
  const wt=n===7&&a(weightColumn)==='N/A'?'N/A':format(weightColumn);
  const size=String(v.DN)+a(Number(v.ListCol))+v.ListUnitsSign+(reducing?' x '+a(Number(v.ListCol),1,small)+v.ListUnitsSign:'')+v.NPS;
  view.headers=[size+' '+v.Title+'  Sch-'+v.Sch,'Weight =  '+wt+' '+v.WeightSign,'','','','',String(v.ActivitySpecLong)];
  view.textResults={status:'available',rows:[{id:'weight',label:'Weight =  ',value:wt,unit:String(v.WeightSign)}]};
  const put=(col:number,value:string)=>writeCell(state.legacyBuffers,1,row,col,value);
  if(n===7)put(39,a(small+2));
  if(n===8)put(4,a(7)!=='N/A'&&a(4,2)!=='N/A'&&vbVal(a(7))<vbVal(a(4,2))?a(8):a(5));
  if(n===9){put(5,a(small+2));put(39,a(4,2));put(44,a(4,2,small));}
  if(n===10){put(39,a(small+2));put(5,vbString(vbRound((vbVal(a(3,2))-vbVal(a(3,2,small)))/2,2),state.culture));}
  if(n===11){view.headers[1]='Weight Long Pattern = '+wt+v.WeightSign;view.headers[2]='Weight Short Pattern = '+format(11)+v.WeightSign;view.textResults={status:'available',rows:[]};}
  view.drawing=buildDisplayList(state,catalog.template(`Ftbw/Ftbw${n}.dxf`),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:[`route:Ftbw${n}`]};
}
export function buttWeldRoute(p:ButtWeldRecipe):FeatureRoute{return {id:p.id,apply(state,_action,catalog){try{return apply(state,catalog,p);}catch(error){return recoverRecipeError(state,catalog,error);}}};}
