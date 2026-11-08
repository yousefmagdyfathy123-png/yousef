import type { WorkAction,WorkState } from '../contracts';
import { vbSingleString } from '../vb/strings';
import { vbRound } from '../vb/numbers';
export type DialogId='about'|'configuration'|'search'|'parameters'|'flexibility';
export type LegacyDialog={id:DialogId;title:string;controls:{id:string;text:string;value:string;options:{value:string;text:string}[]}[];documentId?:string;fieldId?:string};
export function getLegacyDialog(id:DialogId,state:WorkState,fieldId?:string):LegacyDialog{
  if(id==='about')return {id,title:'About Alfadata',controls:[],documentId:'about'};
  if(id==='configuration')return {id,title:' Settings',controls:[
    {id:'Units',text:'General Units',value:String(state.values.Units),options:[{value:'Metric',text:'Metric'},{value:'Imperial',text:'U.S. Customary Units'}]},
    {id:'ListUnits',text:'Pipe size units',value:state.values.ListUnits==='Inches'?'Inches':'Millimetres',options:[{value:'Inches',text:'NPS (inches)'},{value:'Millimetres',text:'DN (millimeters)'}]},
    {id:'DegUnits',text:'Temerature',value:String(state.values.DegUnits),options:[{value:'Celsius',text:'Celsius'},{value:'Fahrenheit',text:'Fahrenheit'}]},
    {id:'Fractionize',text:'Inch Fractions',value:String(state.values.Fractionize),options:[{value:'No',text:'No'},{value:'Yes',text:'Inch Fractions'}]},
  ]};
  if(id==='search')return {id,title:'Find',controls:[{id:'query',text:'Find',value:String(state.values.SearchString??''),options:[]}]};
  if(id==='parameters'&&/^Span[12]$/.test(state.routeId))return {id,title:state.routeId==='Span2'?'Process Area Span Parameters':'Rack Span Parameters',controls:[],
    // frmParameters_Load overrides the caller's process-area path.
    documentId:state.values.Units==='Imperial'?'parameters-imperial':'parameters-metric'};
  if(id==='flexibility'&&/^Fxly[12]$/.test(state.routeId)&&['AmbTemp','DesTemp','Length'].includes(fieldId??'')){
    const length=fieldId==='Length',title=length?(state.routeId==='Fxly2'?'Distance Between Anchors':'Distance To Anchor'):(fieldId==='AmbTemp'?'Ambient Temperature':'Design Temperature');
    const unit=length?(state.values.Units==='Imperial'?'Inches':'mm'):'°'+(state.values.DegUnits==='Fahrenheit'?'F':'C');
    const value=length?vbSingleString(Number(state.values[fieldId!]),state.culture):String(vbRound(Number(state.values[fieldId!]),0));
    return {id,fieldId,title:title+' '+unit,controls:[{id:fieldId!,text:'Value',value,options:[]}]};
  }
  throw new Error('Dialog is not available');
}
/** Commit only through transition: cancellation leaves the engineering state untouched. */
export function dialogWorkAction(dialog:LegacyDialog,values:Record<string,string>):WorkAction{
  if(dialog.id==='search')return {type:'search',query:values.query??''};
  if(dialog.id==='flexibility'&&dialog.fieldId)return {type:'input',fieldId:dialog.fieldId,raw:values[dialog.fieldId]??''};
  if(dialog.id==='configuration'){
    const {Units,ListUnits,DegUnits,Fractionize}=values;
    if(!['Metric','Imperial'].includes(Units)||!['Inches','Millimetres'].includes(ListUnits)||!['Celsius','Fahrenheit'].includes(DegUnits)||!['No','Yes'].includes(Fractionize))throw new Error('Invalid configuration');
    return {type:'configure',units:Units as 'Metric'|'Imperial',listUnits:ListUnits as 'Inches'|'Millimetres',temperature:DegUnits as 'Celsius'|'Fahrenheit',fractions:Fractionize==='Yes'};
  }
  throw new Error('Dialog has no engineering action');
}
