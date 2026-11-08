import type { Catalog,WorkState,TraceEvent } from '../../contracts';
import { loadBank } from '../banks';
import { cell } from '../recipe-view';
import { unavailableView } from '../../state/errors';
import { vbRound,vbVal } from '../../vb/numbers';
import { saveSettings } from '../../state/settings';
import { calculatorView,finish,insulation,insulationCalc,str,fmt,put,val,route,resultRow } from './shared';
function apply(s:WorkState,c:Catalog){
  const v=s.values,n=Number(s.routeId.slice(4)),flanged=n>=3,insulated=n%2===0,trace:TraceEvent[]=[];
  Object.assign(v,{SubTab:s.routeId+'a',TabbCount:n,TabbQty:4,MinMainSize:flanged?5:4,LowerLimit:flanged?5:4,HigherLimit:v.MainSize,DrawDatum:1030});
  const count=loadBank(s,c,1,'Pipe/PipeSTD.csv',3,Number(v.MinMainSize),trace);
  if(flanged){
    const q2=loadBank(s,c,2,'Flom/Flg'+String(v.ASMEClass).slice(0,-1)+'.csv',3,0,trace);
    const q3=loadBank(s,c,3,'Flom/Flg'+String(v.ASMEClass2).slice(0,-1)+'.csv',3,0,trace);
    if(Number(v.MainSize)>q2||Number(v.SmallSize)>q3){v.MainSize=Math.min(Number(v.MainSize),q2);v.SmallSize=Math.min(Number(v.SmallSize),q3);saveSettings(s);const inner=apply(s,c);trace.push(...inner.trace);}
  }
  // The Pipe2 selector scans the pipe bank (not the flange banks).
  for(let col=4;col<=38;col++)if(cell(s,col)!=='0'&&['0',v.Units==='Imperial'?'1':'25'].includes(cell(s,col-1))){v.LowerLimit=col-2;break;}
  v.HigherLimit=v.MainSize;v.SmallSize=Math.max(Number(v.LowerLimit),Math.min(Number(v.MainSize),Number(v.SmallSize)));
  const fields=n===1?['MainSize','SmallSize']:n===2?['MainSize','InsThkIndex','SmallSize','InsThk2Index']:n===3?['MainSize','ASMEClass','SmallSize','ASMEClass2']:['MainSize','ASMEClass','InsThkIndex','SmallSize','ASMEClass2','InsThk2Index'];
  const view=calculatorView(s,count,fields,[49160,49194,49230,49289][n-1]),a=(col:number,b=1,r=Number(v.MainSize))=>cell(s,col,b,r);
  if(['','N/A'].includes(a(3))||(flanged&&(['','N/A'].includes(a(3,2))||['','N/A'].includes(a(3,3,Number(v.SmallSize))))))return {state:s,view:unavailableView(view,String(v.ActivityTitle),'size-class',s),trace,evidenceIds:['route:'+s.routeId]};
  const pipe1=val(s,3)/2,pipe2=val(s,3,1,Number(v.SmallSize))/2,gap=v.Units==='Metric'?25:25.4;
  Object.assign(v,{Pipe1_Radius:pipe1,Pipe2_Radius:pipe2,AnyInt:gap});
  const ins1=insulated?insulationCalc(s,Number(v.InsThkIndex)):0,ins2=insulated?insulationCalc(s,Number(v.InsThk2Index)):0;
  if(flanged){
    Object.assign(v,{A:str(s,val(s,3,2)/2),Pipe1_FlangeRadius:val(s,3,2)/2,Pipe2_FlangeRadius:val(s,3,3,Number(v.SmallSize))/2});
    v.Ans1=str(s,val(s,3,2)/2+ins1+gap+pipe2+ins2);v.Ans2=str(s,val(s,3,3,Number(v.SmallSize))/2+ins2+gap+pipe1+ins1);
    v.Ans3=String(v.Ans2)>String(v.Ans1)?v.Ans2:v.Ans1;
  }else {v.TempString=fmt(s,pipe1+ins1+gap+pipe2+ins2);v.Ans3=v.TempString;}
  if(v.Units==='Metric')v.Ans3=str(s,vbRound(vbVal(String(v.Ans3)),0));
  const size=(row:number)=>String(v.DN)+a(Number(v.ListCol),1,row)+v.ListUnitsSign+v.NPS;
  view.headers=['Pipe Spacing for : '+v.DN+a(Number(v.ListCol))+v.ListUnitsSign+' x '+a(Number(v.ListCol),1,Number(v.SmallSize))+v.ListUnitsSign+v.NPS+(n===4?' Flanged pipes with Insulation':n===2?' Pipes with Insulation':' Pipes'),v.Units==='Metric'?'Gap = 25':'Gap = 1'+v.Inchsign,'','','','',flanged?'B16.5/B16.47 Series A':'ASME B36.10M/19M'];
  put(s,20,size(Number(v.MainSize))+(flanged?(n===4?'  x  ':' ')+v.ASMEClass:''));put(s,21,size(Number(v.SmallSize))+(flanged?(n===4?'  x  ':' ')+v.ASMEClass2:''));
  if(insulated){put(s,30,insulation(s)[Number(v.InsThkIndex)-1]+v.Inchsign+' Thick Insulation');put(s,31,insulation(s)[Number(v.InsThk2Index)-1]+v.Inchsign+' Thick Insulation');}
  if(n===1){put(s,22,'Pipe 1');put(s,23,'Pipe 2 ');put(s,24,String(v.Ans3));}
  if(n===2){put(s,22,'Pipe 1');put(s,23,'Pipe 2');put(s,26,String(v.Ans3));}
  if(n>=3){put(s,24,'Pipe 1');put(s,25,'Pipe 2');if(n===4)for(const col of [22,23,26,27])put(s,col,'_');put(s,n===4?28:26,String(v.Ans3));}
  resultRow(view,'gap','Gap',v.Units==='Metric'?'25':'1',String(v.Inchsign));
  return finish(s,c,view,trace);
}
export const spacingRoutes=[1,2,3,4].map(n=>route('Gpas'+n,apply));
