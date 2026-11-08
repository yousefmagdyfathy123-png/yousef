import { tableRecipe } from '../table-recipe';
import type { TableRecipe } from '../table-recipe';
import { cell } from '../recipe-view';
import { vbRound,vbVal } from '../../vb/numbers';
import { vbString } from '../../vb/strings';
import { writeCell } from '../../state/buffers';
export interface FastenerRecipe extends TableRecipe {weights:number[]}
export function fastenerRoute(p:FastenerRecipe){return tableRecipe(p,(state,view)=>{
  const v=state.values,a=(col:number)=>cell(state,col),id=p.id,nuts=id.startsWith('Nuts'),n=Number(id.slice(4));
  const size=nuts?a(Number(v.ListCol))+(id==='Nuts2'?'"':''):String(v.DN)+a(Number(v.ListCol))+v.ListUnitsSign+v.NPS;
  view.headers=[size+' '+v.Title+(nuts?'':' '+v.ASMEClass+(n<3?' '+v.Face:'')),'','','','','',String(v.ActivitySpecLong)];
  const rows=p.weights.map((col,i)=>{
    const value=vbString(vbRound(vbVal(a(col))*Number(v.WeightFactor)*(nuts?.01:1),2),state.culture),label=[2,4].includes(n)&&!nuts?(i===0?'Paddle Blank Weight = ':'Paddle Spacer Weight = '):'Weight = ';
    view.headers[i+1]=label+value+v.WeightSign;return {id:i===0?'weight':'spacer-weight',label,value,unit:String(v.WeightSign)};
  });view.textResults={status:'available',rows};
  if(nuts)return;
  if(n<3){
    const rf=v.Face==='RF',bolt=a(17)+'" UNC  (or M'+a(18)+')  x ';
    view.headers[5]=(rf?'StudBolt Size RF: ':'StudBolt Size: ')+bolt+a(rf?24:22)+v.Inchsign+' Long';
    view.headers[4]=rf?'Studbolt Size FF: '+bolt+a(23)+v.Inchsign+' Long':'';
    if(n===2)writeCell(state.legacyBuffers,1,Number(v.MainSize),10,a(10)+v.Inchsign+' Indicator Hole');
  }else view.headers[5]='StudBolt Size: '+a(16)+'" UNC  (or M'+a(17)+')  x '+a(20)+v.Inchsign+' Long';
},state=>p.id.slice(0,4)+'/'+p.id+(['Blnu1','Blnu2'].includes(p.id)&&state.values.Face==='RTJ'?'a':'')+'.dxf');}
