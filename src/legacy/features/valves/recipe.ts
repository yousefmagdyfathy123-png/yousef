import type { WorkState,LegacyView } from '../../contracts';
import type { TableRecipe } from '../table-recipe';
import { tableRecipe } from '../table-recipe';
import { cell } from '../recipe-view';
import { vbDouble,vbRound,vbVal } from '../../vb/numbers';
import { vbString } from '../../vb/strings';
import { writeCell } from '../../state/buffers';
export interface ValveRecipe extends TableRecipe {weight:number;note:string;spec:boolean}
export function valveTemplate(state:WorkState):string {
  const v=state.values,id=state.routeId,n=Number(id.slice(4)),family=id.slice(0,4),row=Number(v.MainSize),face=Number(v.FaceIndex);
  let tab=id;
  if(['Vlfl','Vlbw'].includes(family)&&n<=3){
    const limits:Record<string,number>=n<3?{'150#':19,'300#':15,'600#':15,'900#':14,'1500#':14,'2500#':13}:{'150#':14,'300#':13,'600#':13,'900#':12,'1500#':11,'2500#':10};
    if(limits[String(v.ASMEClass)]!==undefined)v.AnyInt=limits[String(v.ASMEClass)];
    const large=row>=Number(v.AnyInt??0);
    if(family==='Vlfl')tab=face===2?id+(large?'c':n===1?'a':'b'):large?id+(n===1?'b':'a'):id;
    else if(large&&(n===3||face===1))tab=id+'a';
  }
  if(family==='Vlfl'&&[5,6].includes(n)&&face===2)tab=id+'a';
  if(family==='Vlfl'&&[7,8].includes(n)&&v.Actuator==='Handwheel')tab=id+'a';
  return family+'/'+tab+'.dxf';
}
export function valveRoute(p:ValveRecipe){
  const subtabs=['Vlfl1','Vlfl2','Vlfl3'].includes(p.id)?{SubSubTab:p.id+(p.id==='Vlfl1'?'a':'b'),SubSubSubTab:p.id+'c'}:undefined;
  return tableRecipe({...p,subtabs},(state:WorkState,view:LegacyView)=>{
    const v=state.values,id=p.id,a=(col:number)=>cell(state,col),fmt=(n:number)=>vbString(n,state.culture);
    const size=String(v.DN)+a(Number(v.ListCol))+v.ListUnitsSign+v.NPS;
    const cls=id.startsWith('Vlsc')||id.startsWith('Vlsw')?v.ValveClass:v.ASMEClass;
    view.headers=[size+' '+v.Title+' '+cls+(id.startsWith('Vlfl')&&Number(id.slice(4))<7?' '+v.Face:''),'','','','',p.note,p.spec?String(v.ActivitySpecLong):''];
    const weight=id==='Vlfl1'?vbDouble(a(p.weight),state.culture):vbVal(a(p.weight));
    const wt=['Vlfl3','Vlbw3'].includes(id)&&a(p.weight)==='N/A'?'N/A ':fmt(vbRound(weight*Number(v.WeightFactor),2));
    const label=id.startsWith('Vlfl')&&id!=='Vlfl3'?'Valve Weight = ':'Weight = ';
    view.headers[1]=label+wt+v.WeightSign;view.textResults={status:'available',rows:[{id:'weight',label,value:wt,unit:String(v.WeightSign)}]};
    if(id==='Vlfl4')writeCell(state.legacyBuffers,1,Number(v.MainSize),13,a(2+Number(v.FaceIndex)));
    if(id==='Vlfl7'||id==='Vlfl8'){
      view.headers[3]='Steel Offset Seat Style';view.headers[4]='Only the face-to-face dimension is standardized by ASME';
      view.headers[5]=(id==='Vlfl7'?'Stud Bolts: ':'Bolts: ')+a(11)+'qty x '+a(17)+'  (or '+a(12)+'" UNC)';
      if(id==='Vlfl7')view.headers[5]+='  x '+fmt(vbRound(vbVal(a(18)),2))+v.Inchsign+' Long';
    }
  },valveTemplate);
}
