import type { FeatureRoute, LegacyControl, WorkResult, WorkState, Catalog, TraceEvent } from '../../../contracts';
import { loadBank } from '../../banks';
import { readCell,writeCell } from '../../../state/buffers';
import { saveSettings,loadSettings } from '../../../state/settings';
import { getSharedOptions } from '../../../state/checks';
import { unavailableView } from '../../../state/errors';
import { buildDisplayList } from '../../../drawing/display-list';
import { vbVal,vbRound } from '../../../vb/numbers';
import { vbString } from '../../../vb/strings';
const sourceRefs=[{path:'audit/executable/Pipedata_Pro_14_1.Module1.cs',hash:'ae2389a910a610523c4e012acf3e65be4f7458c7ca9fdbb0d83d5e2c63d13c6a',line:19174}];
function render(state:WorkState,catalog:Catalog,messages:string[]=[]):WorkResult {
  const v=state.values,trace:TraceEvent[]=[],fi=Number(v.FaceIndex),imperial=v.Units==='Imperial';
  Object.assign(v,{SubTab:'Flan1a',TabbCount:1,TabbQty:7,MinMainSize:5,DrawDatum:1030,Inchsign:imperial?'"':'',WeightFactor:imperial?2.20462:1,WeightSign:imperial?'lb':'kg',ChkType:'U_F_C_S_Z'});
  const cls=String(v.ASMEClass).slice(0,-1),sch=String(v.Sch);
  const paths=[`Flan/${imperial?'FLG_Imperial_':'Flg'}${cls}.csv`,`Pipe/${imperial?'Pipe_Imperial_':'Pipe'}${sch}.csv`,`Flan/Flg${cls}.csv`,`Pipe/Pipe${sch}.csv`];
  const counts=paths.map((path,i)=>loadBank(state,catalog,(i+1) as 1|2|3|4,path,i%2===0?11+fi:4,5,trace));
  if(Number(v.MainSize)>counts[0]){v.MainSize=counts[0];saveSettings(state);loadSettings(state);return render(state,catalog,messages);}
  if(Number(v.MainSize)>counts[1]){v.Sch='STD';saveSettings(state);loadSettings(state);return render(state,catalog,[...messages,`Schedule '${sch}' is not manufactured at this size, reverting to Schedule 'STD'`]);}
  const row=Number(v.MainSize),a=(bank:number,col:number)=>readCell(state.legacyBuffers,bank,row,col)??'',n=(bank:number,col:number)=>vbVal(a(bank,col));
  const opts=getSharedOptions(state),listCol=Number(v.ListCol),listSign=String(v.ListUnitsSign);
  const sizeOptions=Array.from({length:Math.min(44,Math.max(0,counts[0]-4))},(_,i)=>({value:String(i+5),text:(readCell(state.legacyBuffers,1,i+5,listCol)??'')+listSign,enabled:true}));
  const control=(id:string,sourceId:string,options:LegacyControl['options'],x:number):LegacyControl=>({id,sourceId,type:'select',text:id==='MainSize'?a(1,listCol)+listSign:String(v[id]),options,enabled:true,checked:false,visible:true,layout:{x,y:56,width:80,height:33},sourceRefs,showDropDownArrow:false});
  const controls=[control('MainSize','Btn1',sizeOptions,350),control('ASMEClass','Btn2',opts.ASMEClass,430),control('Face','Btn3',opts.Face,510),control('Sch','Btn4',opts.Sch,590)];
  const view:WorkResult['view']={headers:Array(7).fill(''),controls,drawing:{width:1067,height:690,transform:[Math.fround(.6),0,0,Math.fround(.6),.5,105],commands:[]},messages,visibility:Object.fromEntries(Array.from({length:7},(_,i)=>['Label'+(i+1),true])),textResults:{status:'available',rows:[]}};
  if(['','N/A'].includes(a(1,11+fi))||['','N/A'].includes(a(2,4)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-class-face-schedule',state),trace,evidenceIds:['route:Flan1']};
  const od=n(3,3),th=n(3,4),bore=n(4,6),hub=n(3,9)-th,hm=n(3,5),stub=n(3,6),hole=n(3,30),holeQty=n(3,20);
  const disk=vbString((3.14*od**2/4*th-3.14*bore**2/4*th)/1e9*7850,state.culture);
  const parallel=(3.14*stub**2/4*hub-3.14*bore**2/4*hub)/1e9*7850;
  const triangle=(3.14*hm**2/4*hub-3.14*stub**2/4*hub)/1e9*7850/2;
  const holes=3.14*hole**2/4*th*holeQty/1e9*7850;
  const weight=vbString(vbRound((vbVal(disk)+parallel+triangle-holes)*Number(v.WeightFactor),2),state.culture),bolts=vbString(vbRound(n(1,39+fi)*Number(v.WeightFactor),2),state.culture);
  Object.assign(v,{Flg_OD:od,Flg_Thk:th,Flg_Bore:bore,Flg_hub_len:hub,Flg_hub_max_dia:hm,Flg_Stub_OD:stub,Flg_hole_dia:hole,Flg_hole_qty:holeQty,Flange_wt:weight,Flange_Parell:parallel,Flange_Triangle:triangle,Flange_Holes_wt:holes});
  writeCell(state.legacyBuffers,1,row,48,a(1,20)+' Holes');writeCell(state.legacyBuffers,1,row,49,a(1,25)+'" Dia');
  view.headers=[String(v.DN)+a(1,listCol)+listSign+String(v.NPS)+' '+v.Title+' '+v.ASMEClass+' '+v.Face+' Sch-'+sch,'Flange Wt =  '+weight+' '+v.WeightSign,'S/Bolts and Nuts =  '+bolts+' '+v.WeightSign,v.Face==='RTJ'?'RTJ Ring No : '+a(1,15):'',v.Face==='RTJ'?'RTJ Distance Between Flgs : '+a(1,16)+v.Inchsign:'','StudBolt Size : '+a(1,21)+'" UNC  (or M'+a(1,26)+')  x '+a(1,22+fi)+v.Inchsign+' Long',String(v.ActivitySpecLong)];
  view.textResults={status:'available',rows:[{id:'flange-weight',label:'Flange Wt =  ',value:weight,unit:String(v.WeightSign)},{id:'bolts-weight',label:'S/Bolts and Nuts =  ',value:bolts,unit:String(v.WeightSign)}]};
  const template=catalog.template(v.Face==='RTJ'?'Flan/Flan1a.dxf':'Flan/Flan1.dxf');
  view.drawing=buildDisplayList(state,template,catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:Flan1']};
}
export const Flan1:FeatureRoute={id:'Flan1',apply(state,_action,catalog){return render(state,catalog);}};
