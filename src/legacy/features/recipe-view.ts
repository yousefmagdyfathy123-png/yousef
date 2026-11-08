import type { WorkState,LegacyView,LegacyControl } from '../contracts';
import { readCell } from '../state/buffers';
import { getSharedOptions } from '../state/checks';
export const sourceHash='ae2389a910a610523c4e012acf3e65be4f7458c7ca9fdbb0d83d5e2c63d13c6a';
export function cell(state:WorkState,col:number,bank=1,row=Number(state.values.MainSize)):string{return readCell(state.legacyBuffers,bank,row,col)??'';}
export function recipeView(state:WorkState,count:number,fields:string[],line:number,disabled:Record<string,string[]>={}):LegacyView{
  const v=state.values,lc=Number(v.ListCol),sign=String(v.ListUnitsSign),shared=getSharedOptions(state);
  const sizes=(low:number,high:number,limit:number)=>Array.from({length:Math.min(limit,Math.max(0,high-low+1))},(_,i)=>({value:String(low+i),text:cell(state,lc,1,low+i)+sign,enabled:true}));
  const controls:LegacyControl[]=fields.map((field,i)=>({id:field,sourceId:'Btn'+(i+1),type:'select',text:['MainSize','SmallSize'].includes(field)?cell(state,lc,1,Number(v[field]))+sign:String(v[field]),options:(field==='MainSize'?sizes(Number(v.MinMainSize),count,44):field==='SmallSize'?sizes(Number(v.LowerLimit),Number(v.HigherLimit),40):field==='Actuator'?['Lever','Handwheel'].map(value=>({value,text:value,enabled:true})):shared[field]).map(o=>({...o,enabled:!disabled[field]?.includes(o.value)})),enabled:true,checked:false,visible:true,layout:{x:350+i*80,y:56,width:80,height:33},sourceRefs:[{path:'audit/executable/Pipedata_Pro_14_1.Module1.cs',hash:sourceHash,line}],showDropDownArrow:false}));
  return {headers:Array(7).fill(''),controls,drawing:{width:1067,height:690,transform:[Math.fround(.6),0,0,Math.fround(.6),.5,105],commands:[]},messages:[],visibility:Object.fromEntries(Array.from({length:7},(_,i)=>['Label'+(i+1),true])),textResults:{status:'available',rows:[]}};
}
// DesigBtn2ForSmallSize: LowerLimit is inherited when no transition is found.
export function smallSizeLimits(state:WorkState,overrides?:[number,number?]):void{
  const v=state.values;
  for(let col=4;col<=38;col++)if(cell(state,col)!=='0'&&['0',v.Units==='Imperial'?'1':'25'].includes(cell(state,col-1))){v.LowerLimit=col-2;break;}
  v.HigherLimit=Number(v.MainSize)-1;
  if(overrides){v.LowerLimit=Number(overrides[0]);if(overrides[1]!==undefined)v.HigherLimit=overrides[1];}
  v.SmallSize=Math.max(Number(v.LowerLimit??0),Math.min(Number(v.HigherLimit),Number(v.SmallSize)));
}
