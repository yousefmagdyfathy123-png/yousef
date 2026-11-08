import type { WorkState,Catalog,TraceEvent } from '../../contracts';
import { loadBank } from '../banks';
import { cell } from '../recipe-view';
import { unavailableView } from '../../state/errors';
import { calculatorView,clampMain,finish,insulation,put,val,vbStr,str,route } from './shared';
import { vbRound,vbVal } from '../../vb/numbers';
const f=Math.fround;
function calculate(s:WorkState):void{
  const v=s.values;
  if(v.Material==='Carbon Steel')Object.assign(v,{YoungsModulus:203395,LimitingStress:22,Density:7850,YoungsModulus_Imperial:13169,LimitingStress_Imperial:1.4,Density_Imperial:490});
  if(v.Material==='Stainless Steel')Object.assign(v,{YoungsModulus:195121,LimitingStress:24,Density:8000,YoungsModulus_Imperial:12633,LimitingStress_Imperial:1.6,Density_Imperial:499});
  const od=val(s,3),id=f(od-val(s,4)*2),od1=f(od),thick=vbVal(insulation(s)[Number(v.InsThkIndex)-1]??''),od2=f(od+thick*2*Number(v.DimFactor)),area=f(3.1416*od2**2/4-3.1416*od1**2/4),volume=f(area*1000),density=f(1.45e-7),insWeight=f(volume*density);
  const vol=(3.1415927*od**2/4-3.1415927*id**2/4)*1000,kg=vbRound(vol*Number(v.Density??0)/1e9*100,0)/100,water=3.1415927*id**2/4/1000*1.024;
  let total=Number(v.Total_Wt_Mtr??0);if(v.FullorEmpty==='Empty')total=kg+insWeight;if(v.FullorEmpty==='Full')total=kg+water+insWeight;
  const inertia=.0491*(od**4-id**4),radius=od/2,ans1=Math.sqrt(Number(v.LimitingStress??0)/10*10*inertia/(total/1000*radius)),e=f(Number(v.YoungsModulus??0)*.1019716212978),def=od>65?13:8,xx=f(def*1920*e)*inertia/(19*total/1000),ans2=xx**.25;
  const a1=vbStr(s,ans1),a2=str(s,ans2),limited=vbVal(a2)<vbVal(a1);
  Object.assign(v,{OD:od,ID:id,InsulationDensity:density,OD1:od1,OD2:od2,Area:area,Volume:volume,Insul_Wt_Mtr:insWeight,vol,Kg_Per_Mtr:kg,Kg_Per_WtrMtr:water,Total_Wt_Mtr:total,I:inertia,Rad:radius,e,DefMax:def,xx,Ans1:a1,Ans2:a2,Ans3:vbStr(s,vbRound(vbVal(limited?a2:a1)*100/100,0)),LimitedBy:limited?'Deflection':'Stress'});
}
function apply(s:WorkState,c:Catalog){
  const v=s.values,process=s.routeId==='Span2',trace:TraceEvent[]=[];
  Object.assign(v,{SubTab:s.routeId+'a',TabbCount:1,TabbQty:1,MinMainSize:3,DrawDatum:1030});
  const count=loadBank(s,c,1,'Pipe/Pipe'+v.Sch+'.csv',4,3,trace);
  if(clampMain(s,count)){const inner=apply(s,c);trace.push(...inner.trace);}
  const view=calculatorView(s,count,['MainSize','Sch','Material','FullorEmpty','InsThkIndex'],process?53539:53498);
  if(['','N/A'].includes(cell(s,4)))return {state:s,view:unavailableView(view,String(v.ActivityTitle),'size-schedule',s),trace,evidenceIds:['route:'+s.routeId]};
  calculate(s);
  view.headers=[String(v.DN)+cell(s,Number(v.ListCol))+v.ListUnitsSign+v.NPS+'  Sch-'+v.Sch+' '+v.Title,process?'':'This span in limited by '+v.LimitedBy,'','','',process?'':'These spans can be used for vertical guide spacing.',process?'':String(v.ActivitySpecLong)];
  view.visibility.LinkLabel1=true;
  if(!process)put(s,16,String(v.Ans3));
  else {
    const imp=v.Units==='Imperial',step=imp?10:100;
    if(imp)v.Ans3=str(s,vbVal(String(v.Ans3))/25.4);
    const span=vbVal(String(v.Ans3));[.85,.85,.75,.64,.9,.7,.4].forEach((factor,i)=>put(s,7+i,vbStr(s,Math.floor((span*factor+step)/step)*step)+(i===6?v.Inchsign+' Max':'')));
    let size=val(s,2)*5;
    if(imp){const lexical=cell(s,1),parts=lexical.split('+'),fraction=parts.at(-1)!.split('/');size=(fraction.length===2?(parts.length===2?vbVal(parts[0]):0)+vbVal(fraction[0])/vbVal(fraction[1]):vbVal(lexical))*6;}
    put(s,14,vbStr(s,Math.floor(imp?size:(size+100)/100)*(imp?1:100))+v.Inchsign+' Max');
  }
  return finish(s,c,view,trace);
}
export const spanRoutes=[route('Span1',apply),route('Span2',apply)];
