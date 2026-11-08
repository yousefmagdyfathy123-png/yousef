import type { Catalog, WorkAction, WorkState } from '../contracts';
import { loadSettings, saveSettings } from './settings';
import { vbSingle } from '../vb/numbers';
type Config=Extract<WorkAction,{type:'configure'}>;
export function loadConfig(state:WorkState):void {
  const v=state.values, imperial=v.Units==='Imperial';
  Object.assign(v,imperial?{Inchsign:'"',DimFactor:25.4,InvDimFactor:1,WeightFactor:2.2,WeightSign:'lb',PressureSign:'psig',PressureConverter:1,FlowRateSign:'gpm',ViscositySign:'ft/sec',FlowrateConverter:1,VelocityConverter:1,NominalWeightSign:'lb/ft'}:{Inchsign:'',DimFactor:1,InvDimFactor:25.4,WeightFactor:1,WeightSign:'kg',PressureSign:'Barg',PressureConverter:0.0689475728,FlowRateSign:'l/s',ViscositySign:'mtrs/sec',FlowrateConverter:0.0630901964,VelocityConverter:0.3048,NominalWeightSign:'kg/m'});
  Object.assign(v,{ListUnitsSign:v.ListUnits==='Inches'?'"':'',ListCol:v.ListUnits==='Inches'?1:2,TempSign:v.DegUnits==='Celsius'?'C':'F'});
}
export function configureState(state:WorkState, config:Config, catalog?:Catalog):void {
  if(!['Metric','Imperial'].includes(config.units)||!['Inches','Millimetres'].includes(config.listUnits)||!['Celsius','Fahrenheit'].includes(config.temperature)||typeof config.fractions!=='boolean')throw new Error('Invalid workspace configuration');
  const original=state.routeId,v=state.values;
  const visit=(route:string,change:()=>void)=>{state.routeId=route;loadSettings(state);change();saveSettings(state);};
  const restore=()=>{state.routeId=original;loadSettings(state);};
  const convert=(file:string,field:string,from:number,to:number,limit:number)=>{
    if(!catalog)throw new Error('Configuration requires catalog conversion evidence');
    const rows=catalog.table(`Piwt/${file}`).rows;
    for(let i=0;i<limit;i++)if(v[field]===rows[i]?.[from])v[field]=rows[i]?.[to]??'';
  };
  if(v.Units!==config.units){
    if(original==='Piwt1')convert('WallThicknessConverter.csv','PipeWallThk',config.units==='Imperial'?0:1,config.units==='Imperial'?1:0,766);
    for(const route of ['Fxly1','Fxly2'])visit(route,()=>{v.Length=config.units==='Metric'?100000:4000;});restore();
  }
  v.Units=config.units;v.Fractionize=config.fractions?'Yes':'No';
  const list=config.listUnits==='Inches'?'Inches':'Millimeters';
  if(original==='Piwt1'&&v.ListUnits!==list)convert('ConverterList.csv','PipeNominalBore',list==='Inches'?1:0,list==='Inches'?0:1,44);
  v.ListUnits=list;v.NPS=list==='Inches'?'NPS':'';v.DN=list==='Inches'?'':'DN';
  // Button4 saves Fswa1 then Fswa2 without LoadSettings between them, sharing one family store.
  for(const route of ['Fswa1','Fswa2']){state.routeId=route;v.PipeNominalBore2=list==='Inches'?'2':'50';v.PipeReducedSize=list==='Inches'?'1':'25';saveSettings(state);}
  state.routeId=original;saveSettings(state);
  if(v.DegUnits!==config.temperature){
    for(const route of ['Fxly1','Fxly2'])visit(route,()=>{for(const field of ['DesTemp','AmbTemp'])v[field]=config.temperature==='Celsius'?vbSingle(vbSingle(Number(v[field])-32)/1.8):vbSingle(Number(v[field])*1.8+32);});restore();saveSettings(state);
  }
  v.DegUnits=config.temperature;saveSettings(state);v.ActiveComboStyle='';loadConfig(state);
}
