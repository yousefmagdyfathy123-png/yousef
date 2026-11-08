import type { WorkState,LegacyControl } from '../contracts';
import { cell,sourceHash } from './recipe-view';
export function lexicalControl(field:string,text:string,options:LegacyControl['options'],index:number,line:number):LegacyControl{
  return {id:field,sourceId:'Btn'+(index+1),type:'select',text,options,enabled:true,checked:false,visible:true,layout:{x:350+index*80,y:56,width:80,height:33},sourceRefs:[{path:'audit/executable/Pipedata_Pro_14_1.Module1.cs',hash:sourceHash,line}],showDropDownArrow:false};
}
// Nominal selectors emit only the final row of adjacent identical bore strings.
export function nominalOptions(state:WorkState,count:number):LegacyControl['options']{
  const out:LegacyControl['options']=[],lc=Number(state.values.ListCol),sign=String(state.values.ListUnitsSign);
  for(let row=Number(state.values.MinMainSize);row<=count;row++)if(cell(state,lc,1,row)!==cell(state,lc,1,row+1)&&out.length<44){const value=cell(state,lc,1,row);out.push({value,text:value+sign,enabled:true});}
  return out;
}
