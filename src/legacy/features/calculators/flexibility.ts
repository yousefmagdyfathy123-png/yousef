import type { WorkState,Catalog,TraceEvent } from '../../contracts';
import { loadBank } from '../banks';
import { cell } from '../recipe-view';
import { unavailableView } from '../../state/errors';
import { calculatorView,clampMain,finish,fmt,str,put,val,route,resultRow,singleText } from './shared';
const f=Math.fround;
function apply(s:WorkState,c:Catalog){
  const v=s.values,loop=s.routeId==='Fxly2',trace:TraceEvent[]=[];
  Object.assign(v,{SubTab:s.routeId+'a',TabbCount:1,TabbQty:1,MinMainSize:3,DrawDatum:1030});
  for(const key of ['AmbTemp','DesTemp','Length'])v[key]=f(Number(v[key]));
  const count=loadBank(s,c,1,'Pipe/Pipe'+v.Sch+'.csv',4,3,trace);
  if(clampMain(s,count)){const inner=apply(s,c);trace.push(...inner.trace);}
  const view=calculatorView(s,count,['MainSize','Material','AmbTemp','DesTemp','Length'],loop?53862:53821);
  if(['','N/A'].includes(cell(s,4)))return {state:s,view:unavailableView(view,String(v.ActivityTitle),'size-schedule',s),trace,evidenceIds:['route:'+s.routeId]};
  const dt=v.TempSign==='F'?f(f(Number(v.DesTemp)-32)/1.8):f(Number(v.DesTemp));
  const at=v.TempSign==='F'?f(f(Number(v.AmbTemp)-32)/1.8):f(Number(v.AmbTemp));
  const length=v.Units==='Imperial'?f(Number(v.Length)*25.4):f(Number(v.Length)),delta=f(dt-at);
  if(v.Material==='Carbon Steel')Object.assign(v,{Konstant:loop?.65:1.25,ExpnFactor:1});
  if(v.Material==='Stainless Steel')Object.assign(v,{Konstant:loop?.7:1.4,ExpnFactor:1.4});
  Object.assign(v,{CalcDestemp:dt,CalcAmbTemp:at,CalcLength:length,OD:val(s,3)/25.4});
  let ans1=Number(v.Konstant??0)*Math.sqrt(Number(v.OD)*Math.abs(delta)*length);
  let ans2=Math.abs(.012*delta*f(length/1000)/(loop?2:1)*Number(v.ExpnFactor??0));
  if(v.Units==='Imperial'){ans1/=25.4;ans2/=25.4;}
  v.Ans1=str(s,ans1);v.Ans2=str(s,ans2);
  view.headers=[String(v.DN)+cell(s,Number(v.ListCol))+v.ListUnitsSign+v.NPS+' '+v.Title+' '+v.Material,'Ambient Temp: '+singleText(s,Number(v.AmbTemp))+'°'+v.TempSign,'Design Temp: '+singleText(s,Number(v.DesTemp))+'°'+v.TempSign,'','','Calculates required '+(loop?'loop size':'distance to first guide'),String(v.ActivitySpecLong)];
  put(s,14,singleText(s,Number(v.Length)));put(s,16,str(s,Math.floor(Number(v.Ans1))));put(s,17,loop?String(v.Ans2):fmt(s,Number(v.Ans2)));
  put(s,loop?15:18,'Anchor');put(s,19,'First Guide');put(s,20,'Dim A');
  resultRow(view,'ambient','Ambient Temp:',str(s,Number(v.AmbTemp)),'°'+v.TempSign);resultRow(view,'design','Design Temp:',str(s,Number(v.DesTemp)),'°'+v.TempSign);
  if(!loop){
    for(const row of view.textResults!.rows)row.kind='input';
    // Column 16 is the source-rounded quantity consumed by the drawing marker.
    view.textResults!.rows.push({id:'guide-distance',label:'Required distance to first guide',value:cell(s,16),unit:v.Units==='Imperial'?'in':'mm',kind:'output'});
  }
  return finish(s,c,view,trace,Number(v.DesTemp)<Number(v.AmbTemp)?String(v.SubTab):s.routeId);
}
export const flexibilityRoutes=[route('Fxly1',apply),route('Fxly2',apply)];
