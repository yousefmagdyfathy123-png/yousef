import type { Catalog,FeatureRoute,LegacyView,WorkState,TraceEvent,WorkAction } from '../../contracts';
import { cell,recipeView } from '../recipe-view';
import { lexicalControl } from '../lexical-selectors';
import { getSharedOptions } from '../../state/checks';
import { writeCell } from '../../state/buffers';
import { vbRound,vbVal } from '../../vb/numbers';
import { vbString,vbSingleString } from '../../vb/strings';
import { saveSettings,loadSettings } from '../../state/settings';
import { recoverRecipeError } from '../recover';
import { buildDisplayList } from '../../drawing/display-list';
export const insulation=(s:WorkState)=>s.values.Units==='Imperial'?['0','1','1.5','2','2.5','3','4','6','8']:['0','25','40','50','65','75','100','150','200'];
export const insulationCalc=(s:WorkState,index:number)=>(s.values.Units==='Imperial'?[0,25,32,51,64,76,102,152,203]:[0,25,40,50,65,75,100,150,200])[index-1]??0;
export const str=(s:WorkState,n:number)=>Number.isFinite(n)||Number.isNaN(n)?vbString(n,s.culture):n<0?'-∞':'∞';
export const fmt=(s:WorkState,n:number,d=2)=>str(s,vbRound(n,d));
export const singleText=(s:WorkState,n:number)=>vbSingleString(n,s.culture);
export const put=(s:WorkState,col:number,value:string)=>writeCell(s.legacyBuffers,1,Number(s.values.MainSize),col,value);
export const val=(s:WorkState,col:number,bank=1,row=Number(s.values.MainSize))=>vbVal(cell(s,col,bank,row));
export const vbStr=(s:WorkState,n:number)=>(n<0?'':' ')+str(s,n);
export function calculatorView(s:WorkState,count:number,fields:string[],line:number):LegacyView{
  const v=s.values,view=recipeView(s,count,[],line),shared=getSharedOptions(s),lc=Number(v.ListCol),ls=String(v.ListUnitsSign);
  view.controls=fields.map((field,i)=>{
    const sizes=(lo:number,hi:number,limit:number)=>Array.from({length:Math.max(0,Math.min(limit,hi-lo+1))},(_,j)=>({value:String(lo+j),text:cell(s,lc,1,lo+j)+ls,enabled:true}));
    const words:Record<string,string[]>={Material:['Carbon Steel','Stainless Steel'],FullorEmpty:['Full','Empty'],Fluid:['Water','Medium Oil']};
    const options=field==='MainSize'?sizes(Number(v.MinMainSize),count,44):field==='SmallSize'?sizes(Number(v.LowerLimit),Number(v.HigherLimit),40):field.startsWith('InsThk')?insulation(s).map((text,j)=>({value:String(j+1),text:text+v.Inchsign,enabled:true})):words[field]?.map(text=>({value:text,text,enabled:true}))??shared[field==='ASMEClass2'?'ASMEClass':field]??[];
    let text=String(v[field]);
    if(['MainSize','SmallSize'].includes(field))text=cell(s,lc,1,Number(v[field]))+ls;
    if(field.startsWith('InsThk'))text=insulation(s)[Number(v[field])-1]+String(v.Inchsign);
    if(['AmbTemp','DesTemp'].includes(field))text=fmt(s,Number(v[field]),0)+'°'+v.TempSign;
    if(field==='Length')text=fmt(s,vbVal(singleText(s,Number(v.Length))))+v.Inchsign;
    if(field==='Flowrate')text=fmt(s,Number(v.Flowrate)*(v.Units==='Metric'?0.0689475728:1),0)+' '+v.FlowRateSign;
    const c=lexicalControl(field,text,options,i,line);
    if(['AmbTemp','DesTemp','Length'].includes(field))c.type='input';
    // Flow-rate has no constructed event opening a dialog; preserve inert button.
    if(field==='Flowrate')c.type='button';
    c.layout.width=field==='Material'?150:field==='Fluid'?110:80;
    return c;
  });
  let x=350;for(const c of view.controls){c.layout.x=x;x+=c.layout.width;}
  return view;
}
export function resultRow(view:LegacyView,id:string,label:string,value:string,unit=''):void{view.textResults!.rows.push({id,label,value,unit});}
export function finish(s:WorkState,catalog:Catalog,view:LegacyView,trace:TraceEvent[],template=s.routeId){
  try{
  view.drawing=buildDisplayList(s,catalog.template(s.routeId.slice(0,4)+'/'+template+'.dxf'),catalog,{width:1067,height:690});
  return {state:s,view,trace,evidenceIds:['route:'+s.routeId]};
  }catch(error){return recoverRecipeError(s,catalog,error,template);}
}
export function route(id:string,run:(s:WorkState,c:Catalog,a:WorkAction)=>ReturnType<typeof finish>):FeatureRoute {
  return {id,apply(state,action,catalog){try{
    return run(state,catalog,action);
  }catch(error){return recoverRecipeError(state,catalog,error);}}};
}
export function clampMain(s:WorkState,count:number):boolean{if(Number(s.values.MainSize)<=count)return false;s.values.MainSize=count;saveSettings(s);loadSettings(s);return true;}
