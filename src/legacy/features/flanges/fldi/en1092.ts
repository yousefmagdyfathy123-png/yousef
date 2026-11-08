import type { WorkState,Catalog,TraceEvent,WorkResult } from '../../../contracts';
import { loadBank } from '../../banks';
import { flanCell,flanView } from '../flan';
import { saveSettings,loadSettings } from '../../../state/settings';
import { writeCell } from '../../../state/buffers';
import { unavailableView } from '../../../state/errors';
import { buildDisplayList } from '../../../drawing/display-list';
import { vbVal,vbRound,vbDouble } from '../../../vb/numbers';
import { vbString } from '../../../vb/strings';
// Proven EN1092 flow; columns, type and eligibility remain route-specific.
export function applyEN1092(state:WorkState,catalog:Catalog,tab:1|2|3|4|5,line:number):WorkResult{
  const route='Fldi'+tab,sensor={1:9,2:15,3:23,4:22,5:22}[tab],type={1:'01',2:'05',3:'11',4:'12',5:'13'}[tab];
  const v=state.values,trace:TraceEvent[]=[],imperial=v.Units==='Imperial';
  Object.assign(v,{TabbCount:tab,TabbQty:5,SubTab:route+'a',MinMainSize:4,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,DimFactor:imperial?25.4:1,WeightSign:imperial?'lb':'kg'});
  const path=`Fldi/Fldi_${v.DinClass}.csv`,count=loadBank(state,catalog,1,path,sensor,4,trace);
  if(Number(v.MainSize)>count){v.MainSize=count;saveSettings(state);loadSettings(state);trace.push(...applyEN1092(state,catalog,tab,line).trace);}
  v.ChkType='U_D_Z';
  const view=flanView(state,count,['MainSize','DinClass'],line,{MainSize:tab===3&&['160','250','320','400'].includes(String(v.DinClass))?['6','8']:[]},4),a=(col:number)=>flanCell(state,col),row=Number(v.MainSize);
  // DesigBtn2ForPN has12 buttons, including16; the separate checker array has11.
  view.controls[1].text='PN '+v.DinClass;
  view.controls[1].options=['2.5','6','10','16','25','40','63','100','160','250','320','400'].map(value=>({value,text:'PN '+value,enabled:(tab===3||!['160','250','320','400'].includes(value))&&!(tab>=4&&value==='2.5')}));
  if(['','N/A'].includes(a(sensor)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-class-face',state),trace,evidenceIds:['route:'+route]};
  const weight=(column:number)=>vbString(vbRound(vbVal(a(column))*Number(v.WeightFactor),2),state.culture);
  let wt=weight(34+tab);if(wt==='0')wt='N/A';const bolts=weight(44+tab);
  if(imperial)writeCell(state.legacyBuffers,1,row,5,vbString(vbRound(vbDouble(a(5),state.culture)/25.4,2),state.culture));
  writeCell(state.legacyBuffers,1,row,60,a(6)+' Holes');writeCell(state.legacyBuffers,1,row,61,a(5)+v.Inchsign+' Dia');
  const raw=vbString(vbRound(vbVal(a(39+tab))/Number(v.DimFactor)*100,0)/100,state.culture),length=vbString(vbRound(vbVal(raw),2),state.culture);
  view.headers=[String(v.DN)+a(Number(v.ListCol))+v.ListUnitsSign+v.NPS+' '+v.Title+' PN '+v.DinClass+' (Type '+type+')','Flange Wt =  '+wt+' '+v.WeightSign,'S/Bolts and Nuts =  '+bolts+' '+v.WeightSign,'','','StudBolt Size : M'+a(7)+' x '+length+v.Inchsign+' Long',String(v.ActivitySpecLong)];
  view.textResults={status:'available',rows:[{id:'flange-weight',label:'Flange Wt =  ',value:wt,unit:String(v.WeightSign)},{id:'bolts-weight',label:'S/Bolts and Nuts =  ',value:bolts,unit:String(v.WeightSign)}]};
  view.drawing=buildDisplayList(state,catalog.template('Fldi/'+route+'.dxf'),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:'+route]};
}
