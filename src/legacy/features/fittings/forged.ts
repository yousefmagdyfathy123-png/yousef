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
export type ForgedRecipe={id:string;minimum:number;sensor:number;line:number;weight:number|null;disabled:string[];file:(rating:string,imperial:boolean)=>string;limits?:[number,number?]};
const nominal:Record<string,string>={'0+1/8':'0.125','0+1/4':'0.25','0+3/8':'0.375','0+1/2':'0.5','0+3/4':'0.75','1+1/2':'1.5'};
function apply(state:WorkState,catalog:Catalog,p:ForgedRecipe):WorkResult{
  const v=state.values,n=Number(p.id.slice(4)),family=p.id.slice(0,4),imperial=v.Units==='Imperial',trace:TraceEvent[]=[];
  Object.assign(v,{TabbCount:n,TabbQty:family==='Ftsc'?25:14,SubTab:p.id+'a',MinMainSize:p.minimum,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,WeightSign:imperial?'lb':'kg'});
  if(p.id==='Ftsc15')v.MinSmallSize=2;
  const count=loadBank(state,catalog,1,family+'/'+p.file(String(v.Rating),imperial)+'.csv',p.sensor,p.minimum,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...apply(state,catalog,p).trace);}
  const a=(col:number,row=Number(v.MainSize))=>cell(state,col,1,row),fmt=(n:number)=>vbString(n,state.culture),row=Number(v.MainSize);
  if(p.limits)smallSizeLimits(state,[vbRound(vbVal(a(p.limits[0])),0),p.limits[1]===undefined?undefined:vbRound(vbVal(a(p.limits[1])),0)]);
  v.ChkType=p.limits?'U_R_Z_M':'U_R_Z';
  const view=recipeView(state,count,p.limits?['MainSize','SmallSize','Rating']:['MainSize','Rating'],p.line,{Rating:p.disabled});
  if(['','N/A'].includes(a(p.sensor)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-rating',state),trace,evidenceIds:['route:'+p.id]};
  const small=Number(v.SmallSize),lc=Number(v.ListCol),offsets:Record<string,number>={Ftsc14:1,Ftsc15:2,Ftsw10:4,Ftsw11:4,Ftsw12:2};
  let other=a(lc,small);
  if(offsets[p.id]){other=a(small+offsets[p.id],2);other=nominal[other]??(family==='Ftsw'&&other==='2+1/2'?'2.5':other);}
  const size=String(v.DN)+a(lc)+v.ListUnitsSign+(p.limits?' x '+other+v.ListUnitsSign:'')+v.NPS;
  view.headers=[size+' '+v.Title+' '+v.Rating,'','','','','',(family==='Ftsc'&&(n<14||n===25))||(family==='Ftsw'&&(n<8||n===14))?String(v.ActivitySpecLong):'ASME Unadopted'];
  if(p.weight!==null){const wt=fmt(vbRound(vbVal(a(p.weight))*Number(v.WeightFactor),2));view.headers[1]='Weight =  '+wt+' '+v.WeightSign;view.textResults={status:'available',rows:[{id:'weight',label:'Weight =  ',value:wt,unit:String(v.WeightSign)}]};}
  const put=(col:number,value:string)=>writeCell(state.legacyBuffers,1,row,col,value);
  if(p.id==='Ftsc14')put(15,a(small+1));
  if(p.id==='Ftsc15'){
    const x=vbVal(a(4)),y=vbVal(a(12)),z=x+y,total=z+vbVal(a(small+2));Object.assign(v,{Any_x:x,Any_y:y,Any_z:z});
    put(14,a(small+2,3));put(15,a(small+2));put(16,(total>=0?' ':'')+fmt(total));put(17,'Across Flats');
  }
  if(p.id==='Ftsc17')put(9,'Across Flats');
  if(p.id==='Ftsc25'){put(7,'Thread Engagement');put(8,'Internal Thread');put(9,'External Thread');}
  if(p.id==='Ftsw8'){put(10,a(small+8,4));put(11,a(small+8,5));put(12,a(small+8,6));}
  if(p.id==='Ftsw10'){put(7,a(small+4));put(8,a(small+12));put(9,a(small+20));}
  if(p.id==='Ftsw11'){put(15,a(small+4));put(16,a(small+14));}
  if(p.id==='Ftsw12'){put(37,a(small+2));put(38,a(small+12));put(39,a(small+22));}
  view.drawing=buildDisplayList(state,catalog.template(family+'/'+p.id+'.dxf'),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:'+p.id]};
}
export function forgedRoute(p:ForgedRecipe):FeatureRoute{return {id:p.id,apply(state,_action,catalog){try{return apply(state,catalog,p);}catch(error){return recoverRecipeError(state,catalog,error);}}};}
