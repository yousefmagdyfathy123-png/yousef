import type { LegacyControl, LegacyView,WorkState } from '../../contracts';
import { readCell,writeCell } from '../../state/buffers';
import { getSharedOptions } from '../../state/checks';
import { vbRound,vbVal } from '../../vb/numbers';
import { vbString } from '../../vb/strings';
export function flanBase(state:WorkState,tab:number,subtab:string,checkType:string):void{
  const imperial=state.values.Units==='Imperial';
  Object.assign(state.values,{TabbCount:tab,TabbQty:7,SubTab:subtab,MinMainSize:5,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,WeightSign:imperial?'lb':'kg',ChkType:checkType});
}
export function flanCell(state:WorkState,column:number,bank=1):string{return readCell(state.legacyBuffers,bank,Number(state.values.MainSize),column)??'';}
export function flanView(state:WorkState,count:number,fields:string[],line:number,disabled:Record<string,string[]>={},minimum=5):LegacyView{
  const v=state.values,col=Number(v.ListCol),sign=String(v.ListUnitsSign),shared=getSharedOptions(state);
  const sizes=Array.from({length:Math.min(44,Math.max(0,count-minimum+1))},(_,i)=>({value:String(i+minimum),text:(readCell(state.legacyBuffers,1,i+minimum,col)??'')+sign,enabled:true}));
  const controls:LegacyControl[]=fields.map((field,i)=>({id:field,sourceId:'Btn'+(i+1),type:'select',text:field==='MainSize'?flanCell(state,col)+sign:String(v[field]),options:(field==='MainSize'?sizes:shared[field]).map(o=>({value:o.value,text:o.text,enabled:!disabled[field]?.includes(o.value)})),enabled:true,checked:false,visible:true,layout:{x:350+i*80,y:56,width:80,height:33},sourceRefs:[{path:'audit/executable/Pipedata_Pro_14_1.Module1.cs',hash:'ae2389a910a610523c4e012acf3e65be4f7458c7ca9fdbb0d83d5e2c63d13c6a',line}],showDropDownArrow:false}));
  return {headers:Array(7).fill(''),controls,drawing:{width:1067,height:690,transform:[Math.fround(.6),0,0,Math.fround(.6),.5,105],commands:[]},messages:[],visibility:Object.fromEntries(Array.from({length:7},(_,i)=>['Label'+(i+1),true])),textResults:{status:'available',rows:[]}};
}
// Proven identical bolting/header fields in Flan2–5; weights/eligibility are
// selected explicitly in each route, never inferred from the current family.
export function flanTabularHeaders(state:WorkState,view:LegacyView,weightColumn:number):void{
  const v=state.values,fi=Number(v.FaceIndex),a=(col:number)=>flanCell(state,col),row=Number(v.MainSize);
  writeCell(state.legacyBuffers,1,row,48,a(20)+' Holes');writeCell(state.legacyBuffers,1,row,49,a(25)+'" Dia');
  const format=(col:number)=>vbString(vbRound(vbVal(a(col))*Number(v.WeightFactor),2),state.culture);
  const wt=format(weightColumn),bolts=format(39+fi);
  view.headers=[String(v.DN)+a(Number(v.ListCol))+v.ListUnitsSign+v.NPS+' '+v.Title+' '+v.ASMEClass+' '+v.Face,'Flange Wt =  '+wt+' '+v.WeightSign,'S/Bolts and Nuts =  '+bolts+' '+v.WeightSign,v.Face==='RTJ'?'RTJ Ring No : '+a(15):'',v.Face==='RTJ'?'RTJ Distance Between Flgs : '+a(16)+v.Inchsign:'','StudBolt Size : '+a(21)+'" UNC  (or M'+a(26)+')  x '+a(22+fi)+v.Inchsign+' Long',String(v.ActivitySpecLong)];
  view.textResults={status:'available',rows:[{id:'flange-weight',label:'Flange Wt =  ',value:wt,unit:String(v.WeightSign)},{id:'bolts-weight',label:'S/Bolts and Nuts =  ',value:bolts,unit:String(v.WeightSign)}]};
}
