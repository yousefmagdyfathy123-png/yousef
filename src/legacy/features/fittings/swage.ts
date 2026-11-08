import type { FeatureRoute,WorkState,Catalog,WorkResult,TraceEvent } from '../../contracts';
import { loadBank } from '../banks';
import { cell,recipeView } from '../recipe-view';
import { lexicalControl,nominalOptions } from '../lexical-selectors';
import { writeCell } from '../../state/buffers';
import { saveSettings,loadSettings } from '../../state/settings';
import { unavailableView } from '../../state/errors';
import { buildDisplayList } from '../../drawing/display-list';
import { recoverRecipeError } from '../recover';
import { vbRound,vbVal } from '../../vb/numbers';
import { vbString } from '../../vb/strings';
const disabled=['5s','5','10s','10','20','30','40s','40','60','80s','80','100','120','140'],lines=[57548,57631,57719];
function apply(state:WorkState,catalog:Catalog,n:number):WorkResult{
  const v=state.values,imperial=v.Units==='Imperial',trace:TraceEvent[]=[],line=lines[n-1];
  Object.assign(v,{TabbCount:n,TabbQty:3,SubTab:`Fswa${n}a`,MinMainSize:3,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,WeightSign:imperial?'lb':'kg'});
  const path=`Fswa/Fswa${n===3?2:1}_${imperial?'USCust':'Metric'}.csv`,count=loadBank(state,catalog,1,path,3,3,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...apply(state,catalog,n).trace);}
  const a=(col:number,row=Number(v.MainSize))=>cell(state,col,1,row),row=Number(v.MainSize),lc=Number(v.ListCol),put=(col:number,value:string)=>writeCell(state.legacyBuffers,1,row,col,value),fmt=(value:number)=>vbString(value,state.culture);
  let reduced:string[]=[];
  if(n<3){
    loadBank(state,catalog,1,path,3,3,trace);
    for(let r=1;r<=count;r++)if(a(lc,r)===v.PipeNominalBore2)reduced.push(a(lc+2,r));
    const found=reduced.includes(String(v.PipeReducedSize));if(!found)v.PipeReducedSize=reduced.at(-1)??'';
    Object.assign(v,{ReducedSizeQty:reduced.length,WT_Found:found?'Yes':'No'});reduced.forEach((s,i)=>{v['ReducedSize:'+i]=s;});
  }
  v.ChkType=n===1?'U_S_Z':'U_R_Z';
  const view=recipeView(state,count,n===3?['MainSize','Sch']:['Sch'],line,{Sch:disabled});
  if(n<3){
    const schedule=view.controls[0];schedule.sourceId='Btn3';schedule.layout.x=510;
    view.controls=[lexicalControl('PipeNominalBore2',String(v.PipeNominalBore2)+v.ListUnitsSign,nominalOptions(state,count),0,line),lexicalControl('PipeReducedSize',String(v.PipeReducedSize)+v.ListUnitsSign,reduced.slice(0,19).map(value=>({value,text:value+v.ListUnitsSign,enabled:true})),1,line),schedule];
  }
  if(n!==1&&['','N/A'].includes(a(3)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-rating',state),trace,evidenceIds:[`route:Fswa${n}`]};
  const schedule=String(v.Sch),offset:Record<string,number>={STD:0,'40':0,XS:1,'80':1,'160':2,XXS:3};
  if(n<3){
    for(let r=3;r<=count;r++)if(a(lc,r)===v.PipeNominalBore2&&a(lc+2,r)===v.PipeReducedSize){
      const index=offset[schedule];if(index!==undefined)Object.assign(v,{AnyInt:8+index,AnyInt2:12+index,AnyInt3:16+index});
      for(let col=1;col<=7;col++)put(col,a(col,r));
      put(8,a(Number(v.AnyInt??0),r));put(12,a(Number(v.AnyInt2??0),r));put(16,a(Number(v.AnyInt3??0),r));put(20,a(20,r));
      for(const [col,text] of Object.entries({21:'37.5*',22:'45*',23:'Max',24:'Plain End',25:'Threaded End',26:'Bevel End'}))put(Number(col),text);
      break;
    }
    const part=(col:number)=>String(v.DN)+a(col)+v.ListUnitsSign+v.NPS;let weight=fmt(vbRound(vbVal(a(16))*Number(v.WeightFactor),2));if(weight==='0')weight='N/A';
    view.headers=[part(lc)+' x '+part(lc+2)+' '+v.Title+' Sch-'+v.Sch,'Weight =  '+weight+' '+v.WeightSign,'','','','',String(v.ActivitySpecLong)];
  }else{
    for(const [col,text] of Object.entries({11:'37.5*',12:a(5)+v.Inchsign+' ~ '+a(6)+v.Inchsign,13:'Long Nipple',14:'Close Nipple',15:'Short Nipple',16:'Plain End',17:'Bevel End'}))put(Number(col),text);
    if(offset[schedule]!==undefined)put(18,a(7+offset[schedule]));
    let weight=fmt(vbRound(vbVal(a(18)),2));if(weight==='0')weight='N/A';
    view.headers=[String(v.DN)+a(lc)+v.ListUnitsSign+v.NPS+' '+v.Title+' Sch-'+v.Sch,'Weight =  '+weight+' '+v.WeightSign+(imperial?'/ft':'/m'),'','','','',String(v.ActivitySpecLong)];
  }
  view.drawing=buildDisplayList(state,catalog.template(`Fswa/Fswa${n}.dxf`),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:[`route:Fswa${n}`]};
}
export function swageRoute(n:1|2|3):FeatureRoute{return {id:`Fswa${n}`,apply(state,_action,catalog){try{return apply(state,catalog,n);}catch(error){return recoverRecipeError(state,catalog,error);}}};}
