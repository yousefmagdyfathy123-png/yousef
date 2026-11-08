import type { FeatureRoute,WorkState,Catalog,WorkResult,TraceEvent } from '../../contracts';
import { loadBank } from '../banks';
import { cell,recipeView } from '../recipe-view';
import { writeCell } from '../../state/buffers';
import { saveSettings,loadSettings } from '../../state/settings';
import { unavailableView } from '../../state/errors';
import { buildDisplayList } from '../../drawing/display-list';
import { recoverRecipeError } from '../recover';
import { vbVal,vbRound } from '../../vb/numbers';
import { vbString } from '../../vb/strings';
export type BranchRecipe={id:string;line:number;minimum:number;lower:number;subtab:string;fields:string[];disabled:Record<string,string[]>;file:(state:WorkState)=>string;elbow:boolean;weight:number;smallBank:1|2};
function apply(state:WorkState,catalog:Catalog,p:BranchRecipe):WorkResult{
  const v=state.values,n=Number(p.id.slice(4)),family=p.id.slice(0,4),imperial=v.Units==='Imperial',trace:TraceEvent[]=[];
  Object.assign(v,{TabbCount:n,TabbQty:family==='Wbol'?13:12,SubTab:p.subtab,MinMainSize:p.minimum,LowerLimit:p.lower,HigherLimit:family==='Wbol'&&n>=10?(v.MainSize===1?-1:0):Number(v.MainSize),DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,WeightSign:imperial?'lb':'kg'});
  const count=loadBank(state,catalog,1,'Pipe/PipeSTD.csv',3,p.minimum,trace),branchCount=loadBank(state,catalog,2,family+'/'+p.file(state)+'.csv',3,p.minimum,trace);
  if(p.elbow)loadBank(state,catalog,3,'Ftbw/90ElbowSTD.csv',3,p.minimum,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...apply(state,catalog,p).trace);}
  if(p.id==='Wbol8'&&Number(v.SmallSize)>branchCount){v.SmallSize=branchCount;saveSettings(state);loadSettings(state);trace.push(...apply(state,catalog,p).trace);}
  v.HigherLimit=Math.min(Number(v.MainSize),branchCount);v.SmallSize=Math.max(p.lower,Math.min(Number(v.SmallSize),Number(v.HigherLimit)));
  v.ChkType=p.fields.includes('ASMEClass')?(p.fields.includes('Sch')?'U_C_S_Z_M':'U_C_Z_M'):p.fields.includes('Sch')?'U_S_Z_M':'U_R_Z_M';
  const view=recipeView(state,count,p.fields,p.line,p.disabled),row=Number(v.MainSize),small=Number(v.SmallSize),lc=Number(v.ListCol),a=(bank:number,col:number,r=row)=>cell(state,col,bank,r),num=(bank:number,col:number,r=row)=>vbVal(a(bank,col,r)),fmt=(x:number)=>vbString(x,state.culture),str=(x:number)=>(x>=0?' ':'')+fmt(x),put=(col:number,value:string)=>writeCell(state.legacyBuffers,1,row,col,value);
  const branch=view.controls[1];branch.text=a(2,lc,small)+v.ListUnitsSign;branch.options=Array.from({length:Math.min(40,Math.max(0,Number(v.HigherLimit)-p.lower+1))},(_,i)=>({value:String(p.lower+i),text:a(2,lc,p.lower+i)+v.ListUnitsSign,enabled:true}));
  if(['','N/A'].includes(a(1,3)))return {state,view:unavailableView(view,String(v.ActivityTitle),family==='Wbol'?'size-class-face':n<=3?'size-schedule':n<=8?'size-rating':'size-class',state),trace,evidenceIds:['route:'+p.id]};
  const radius=num(1,3)/2,elbow=p.elbow?num(3,5):0,curve=Math.sqrt((elbow+radius)**2-elbow**2);
  const menuCounter=Math.max(0,Number(v.HigherLimit)-p.lower+1)+1;
  let cc=menuCounter;const classColumn:Record<number,number>={1:3,2:5,4:7,5:9,6:11,7:13};
  if(family==='Wbpi'&&n>=10){cc=classColumn[Number(v.ASMEClassIndex)]??cc;v.c=cc;}
  const wt=fmt(vbRound(num(2,family==='Wbpi'&&n>=10?cc+1:p.weight,small)*Number(v.WeightFactor),2));
  const size=String(v.DN)+a(1,lc)+v.ListUnitsSign+' x '+a(p.smallBank,lc,small)+v.ListUnitsSign+v.NPS;
  const suffix=family==='Wbol'?(n===1?' Sch-'+v.Sch:n>=10?' '+v.ASMEClass+(n<13?' Sch-'+v.Sch:''):' '+v.Rating):(n<=3?' Sch - '+v.Sch:n<=9?' '+v.Rating:' '+v.ASMEClass);
  view.headers=[size+' '+v.Title+suffix,'Weight = '+wt+v.WeightSign,'','','','',String(v.ActivitySpecLong)];
  view.textResults={status:'available',rows:[{id:'weight',label:'Weight = ',value:wt,unit:String(v.WeightSign)}]};
  if(family==='Wbol'){
    if(n===1){put(10,str(radius+num(2,3,small)));put(11,a(2,4,small));put(12,a(2,5,small));}
    if(n===2){put(10,fmt(vbRound(num(2,3,small)+curve,0)));put(9,fmt(num(2,3,small)+curve));}
    if([3,6,9].includes(n)){put(10,fmt(vbRound(Math.sqrt(radius**2*2)+num(2,3,small),0)));put(20,'45*');}
    if([4,7].includes(n)){put(7,str(radius+num(2,3,small)));put(10,a(2,4,small));put(11,a(2,5,small));}
    if([5,8].includes(n))put(9,fmt(vbRound(num(2,3,small)+curve,0)));
    if(n>=10){
      const si=Number(v.ScheduleIndex);let offset=menuCounter;
      if(n===10){if(si>=4&&si<=9)offset=0;if(si>=12&&si<=13)offset=1;if(si>=17&&si<=18)offset=2;}
      else {if(si>=4&&si<=13)offset=0;if(si>=17&&si<=18)offset=1;}
      v.c=offset;const col=n===13?3:3+offset;
      const base=n===11?curve-elbow:n===12?Math.sqrt(radius**2*2):radius;
      put(10,a(2,col,small)==='N/A'?'N/A':fmt(vbRound(base+num(2,col,small),0)));
      if(n===12)put(20,'45*');
    }
  }else{
    if([1,4,7].includes(n)){put(9,str(radius+num(2,3,small)));put(10,a(2,4,small));}
    if([2,5,8].includes(n))put(10,fmt(num(2,3,small)+curve));
    if([3,6,9].includes(n))put(10,fmt(Math.sqrt(radius**2*2)+num(2,3,small)));
    if(n===10)put(10,str(radius+num(2,cc,small)));
    if(n===11)put(10,fmt(num(2,cc,small)+curve-elbow));
    if(n===12)put(10,str(Math.sqrt(radius**2*2)+num(2,cc,small)));
  }
  view.drawing=buildDisplayList(state,catalog.template(family+'/'+p.id+'.dxf'),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:'+p.id]};
}
export function branchRoute(p:BranchRecipe):FeatureRoute{return {id:p.id,apply(state,_action,catalog){try{return apply(state,catalog,p);}catch(error){return recoverRecipeError(state,catalog,error);}}};}
