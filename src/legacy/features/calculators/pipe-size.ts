import type { WorkState,Catalog,TraceEvent } from '../../contracts';
import { loadBank } from '../banks';
import { cell } from '../recipe-view';
import { unavailableView } from '../../state/errors';
import { vbVal } from '../../vb/numbers';
import { calculatorView,clampMain,finish,fmt,str,put,route,resultRow } from './shared';
function apply(s:WorkState,c:Catalog){
  const v=s.values,trace:TraceEvent[]=[];Object.assign(v,{SubTab:'Pwal1a',TabbCount:1,TabbQty:1,MinMainSize:3,DrawDatum:1030});
  const count=loadBank(s,c,1,'Pipe/PipeSTD.csv',4,3,trace);
  if(clampMain(s,count)){const inner=apply(s,c);trace.push(...inner.trace);}
  const view=calculatorView(s,count,['Fluid','Material','Flowrate'],54827);
  if(['','N/A'].includes(cell(s,4)))return {state:s,view:unavailableView(view,String(v.ActivityTitle),'size-schedule',s),trace,evidenceIds:['route:Psiz1']};
  if(v.Fluid==='Water')Object.assign(v,{PsizDensity:1,PsizViscosity:1});
  if(v.Material==='Carbon Steel')v.PsizRoughness=.046;if(v.Material==='Stainless Steel')v.PsizRoughness=.045;
  const mass=Number(v.PsizDensity??0)*63,c1=1-Number(v.PsizViscosity??0)/2000,c2=1-Number(v.PsizRoughness??0)/2.5,velocity=32.5/mass**(1/3)*c1*c2,flow=Number(v.Flowrate)*.13368055556/60,dia=Math.sqrt(flow*4/(velocity*3.14))*12;
  Object.assign(v,{Mass:mass,Visc_Coef1:c1,Visc_Coef2:c2,PsizVelocity:velocity,PsizFlowRate_CuFtSec:flow,PsizDia:dia});
  const vel=fmt(s,vbVal(str(s,velocity*Number(v.VelocityConverter)))),diam=fmt(s,vbVal(str(s,dia*Number(v.InvDimFactor))));v.TempString=diam;
  view.headers=['Pipe Size Ready Reckoner','Optimum Velocity '+vel+' '+v.ViscositySign,'','','','',String(v.ActivitySpecLong)];
  put(s,10,diam+v.Inchsign);put(s,11,'Minimum Inside Diameter');resultRow(view,'velocity','Optimum Velocity',vel,String(v.ViscositySign));resultRow(view,'diameter','Minimum Inside Diameter',diam,String(v.Inchsign));
  // Its Pwal1a scratch SubTab is not selected by GetSubTab for Psiz1.
  return finish(s,c,view,trace);
}
export const pipeSizeRoutes=[route('Psiz1',apply)];
