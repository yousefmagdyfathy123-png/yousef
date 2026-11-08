import type { FeatureRoute,WorkState,Catalog,WorkResult,TraceEvent } from '../../../contracts';
import { loadBank } from '../../banks';
import { cell,recipeView } from '../../recipe-view';
import { lexicalControl,nominalOptions } from '../../lexical-selectors';
import { writeCell } from '../../../state/buffers';
import { saveSettings,loadSettings } from '../../../state/settings';
import { unavailableView } from '../../../state/errors';
import { buildDisplayList } from '../../../drawing/display-list';
import { recoverRecipeError } from '../../recover';
import { vbRound,vbVal } from '../../../vb/numbers';
import { vbString } from '../../../vb/strings';
function apply(state:WorkState,catalog:Catalog):WorkResult{
  const v=state.values,imperial=v.Units==='Imperial',trace:TraceEvent[]=[];
  Object.assign(v,{TabbCount:1,TabbQty:1,SubTab:'Piwt1a',MinMainSize:4,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,WeightSign:imperial?'lb/ft':'kg/m'});
  const path='Piwt/Piwt1_CarbonSteel_'+(imperial?'Imperial':'Metric')+'.csv',count=loadBank(state,catalog,1,path,4,4,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...apply(state,catalog).trace);}
  loadBank(state,catalog,1,path,4,4,trace);
  const a=(col:number,row=Number(v.MainSize))=>cell(state,col,1,row),lc=Number(v.ListCol),row=Number(v.MainSize),fmt=(n:number)=>vbString(n,state.culture),walls:{value:string;x:string;y:string}[]=[];
  for(let r=1;r<=count;r++)if(a(lc,r)===v.PipeNominalBore)walls.push({value:a(4,r),x:a(6,r),y:a(7,r)});
  const found=walls.some(o=>o.value===v.PipeWallThk);if(!found)v.PipeWallThk=walls[vbRound(walls.length/2,0)-1]?.value??'';
  Object.assign(v,{WThkQty:walls.length,WT_Found:found?'Yes':'No'});
  walls.forEach((o,i)=>{v['WThk:'+i]=o.value;v['WThk2:'+i]=o.x;v['WThk3:'+i]=o.y;});
  const view=recipeView(state,count,[],44926);
  view.controls=[lexicalControl('PipeNominalBore',String(v.PipeNominalBore)+v.ListUnitsSign,nominalOptions(state,count),0,44926),lexicalControl('PipeWallThk',String(v.PipeWallThk)+v.Inchsign,walls.slice(0,40).map(o=>({value:o.value,text:o.value+v.Inchsign+' '+(o.x?'Sch-'+o.x:'')+(o.x&&o.y?', ':'')+(o.y?'Sch-'+o.y:''),enabled:true})),1,44926)];
  if(['','N/A'].includes(a(4)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-schedule',state),trace,evidenceIds:['route:Piwt1']};
  let matching='';
  for(let r=4;r<=count;r++)if(a(lc,r)===v.PipeNominalBore&&a(4,r)===v.PipeWallThk){
    const x=a(6,r),y=a(7,r),total=a(9,r);matching=x&&y?'Matching Schedule Sch-'+x+' and Sch-'+y:x?'Corresponding Schedule: Sch-'+x:y?'Matching Schedule Sch-'+y:'Matching Schedule None';
    // Keep the source's in-place copy order when r happens to equal MainSize.
    for(let col=1;col<=5;col++)writeCell(state.legacyBuffers,1,row,col,a(col,r));
    writeCell(state.legacyBuffers,1,row,8,fmt(vbVal(a(3,r))-vbVal(a(4,r))*2));writeCell(state.legacyBuffers,1,row,9,fmt(vbVal(a(3,r))/2));writeCell(state.legacyBuffers,1,row,10,total);break;
  }
  view.headers=[String(v.DN)+a(lc)+v.ListUnitsSign+v.NPS+' Pipe x '+a(4)+v.Inchsign+' Wall Thickness','Weight =  '+fmt(vbRound(vbVal(a(5)),2))+' '+v.WeightSign,'Weight full with water =  '+fmt(vbRound(vbVal(a(10)),2))+' '+v.WeightSign,'',matching,'Material: Carbon Steel',String(v.ActivitySpecLong)];
  view.drawing=buildDisplayList(state,catalog.template('Piwt/Piwt1.dxf'),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:Piwt1']};
}
export const Piwt1:FeatureRoute={id:'Piwt1',apply(state,_action,catalog){try{return apply(state,catalog);}catch(error){return recoverRecipeError(state,catalog,error);}}};
