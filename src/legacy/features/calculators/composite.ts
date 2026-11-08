import type { WorkState,Catalog,TraceEvent } from '../../contracts';
import { loadBank } from '../banks';
import { cell } from '../recipe-view';
import { unavailableView } from '../../state/errors';
import { calculatorView,clampMain,finish,put,val,vbStr,route } from './shared';
import { vbRound } from '../../vb/numbers';
function apply(s:WorkState,c:Catalog){
  const v=s.values,imp=v.Units==='Imperial',face=Number(v.FaceIndex),trace:TraceEvent[]=[];
  Object.assign(v,{SubTab:'Comp1aa',TabbCount:1,TabbQty:1,MinMainSize:6,HigherLimit:v.MainSize,DrawDatum:1030});
  const count=loadBank(s,c,1,'Flom/'+(imp?'FLG_Imperial_':'Flg')+String(v.ASMEClass).slice(0,-1)+'.csv',3+face,6,trace);
  loadBank(s,c,2,'Flom/90Elbow'+(imp?'_Imperial_':'')+'STD.csv',3,0,trace);
  loadBank(s,c,3,'Ftbw/ReducingTee'+(imp?'_Imperial_':'')+'STD.csv',3,0,trace);
  if(clampMain(s,count)){const inner=apply(s,c);trace.push(...inner.trace);}
  for(let col=4;col<=38;col++)if(cell(s,col,3)!=='0'&&['0',imp?'1':'25'].includes(cell(s,col-1,3))){v.LowerLimit=col-2;break;}
  v.HigherLimit=Number(v.MainSize)-1;v.SmallSize=Math.max(Number(v.LowerLimit??0),Math.min(Number(v.HigherLimit),Number(v.SmallSize)));v.ChkType='U_F_C_Z_M';
  const view=calculatorView(s,count,['MainSize','SmallSize','ASMEClass','Face'],53400),a=(col:number,b=1,r=Number(v.MainSize))=>cell(s,col,b,r);
  if(['','N/A'].includes(a(3+face)))return {state:s,view:unavailableView(view,String(v.ActivityTitle),'size-class',s),trace,evidenceIds:['route:Comp1']};
  view.headers=[String(v.DN)+a(Number(v.ListCol))+v.ListUnitsSign+' x '+a(Number(v.ListCol),1,Number(v.SmallSize))+v.ListUnitsSign+v.NPS+' '+v.ASMEClass+' '+v.Face+' '+v.Title,'','','','','',String(v.ActivitySpecLong)];
  put(s,10,a(4,3));put(s,11,a(5,2));put(s,12,a(7,2));put(s,13,a(3+face));put(s,14,a(Number(v.SmallSize)+2,3));
  put(s,15,vbStr(s,val(s,3+face)+val(s,5,2)));put(s,16,vbStr(s,val(s,4,3)+val(s,3+face)));put(s,17,vbStr(s,val(s,5,2)+val(s,4,3)));
  put(s,18,vbStr(s,val(s,13)+val(s,12)));put(s,19,vbStr(s,val(s,12)*2));put(s,20,vbStr(s,vbRound(Math.sin(.7853985000000001)*val(s,19),2)));
  put(s,21,a(3+face,1,Number(v.SmallSize)));put(s,22,vbStr(s,val(s,14)+val(s,21)));
  return finish(s,c,view,trace);
}
export const compositeRoutes=[route('Comp1',apply)];
