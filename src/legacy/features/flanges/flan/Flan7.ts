import type { FeatureRoute,WorkState,Catalog,TraceEvent,WorkResult } from '../../../contracts';
import { loadBank } from '../../banks';
import { flanBase,flanCell,flanView } from '../flan';
import { saveSettings,loadSettings } from '../../../state/settings';
import { writeCell } from '../../../state/buffers';
import { unavailableView } from '../../../state/errors';
import { buildDisplayList } from '../../../drawing/display-list';
import { recoverRecipeError } from '../../recover';
import { vbDouble,vbVal,vbRound } from '../../../vb/numbers';
import { vbString } from '../../../vb/strings';
function apply(state:WorkState,catalog:Catalog):WorkResult{
  flanBase(state,7,'Flan7a','U_C_Z');const v=state.values,trace:TraceEvent[]=[],fi=Number(v.FaceIndex),imperial=v.Units==='Imperial';v.Sch='STD';
  const cls=String(v.ASMEClass).slice(0,-1),paths=[`Flan/${imperial?'FLG_Imperial_':'Flg'}${cls}.csv`,`Pipe/${imperial?'Pipe_Imperial_':'Pipe'}STD.csv`,`Flan/Flg${cls}.csv`,'Pipe/PipeSTD.csv'];
  const counts=paths.map((path,i)=>loadBank(state,catalog,(i+1) as 1|2|3|4,path,i%2===0?11+fi:4,5,trace));
  if(Number(v.MainSize)>counts[0]){
    v.MainSize=counts[0];saveSettings(state);loadSettings(state);
    // Source Clicker returns to this outer handler; do not skip its second
    // header pass, which accumulates the hidden previous Flange_wt again.
    const nested=apply(state,catalog);trace.push(...nested.trace);
  }
  const view=flanView(state,counts[0],['MainSize','ASMEClass','Face'],19684),row=Number(v.MainSize),a=(col:number,bank=1)=>flanCell(state,col,bank);
  if(['','N/A'].includes(a(11+fi)))return {state,view:unavailableView(view,String(v.ActivityTitle),'size-class-face',state),trace,evidenceIds:['route:Flan7']};
  writeCell(state.legacyBuffers,1,row,48,a(20)+' Holes');writeCell(state.legacyBuffers,1,row,49,a(25)+'" Dia');
  const od=vbVal(a(5,3)),bore=vbVal(a(6,4)),th=vbVal(a(4,3)),hub=(row>14?305:229)-th;
  const kg=(3.14*od**2/4*hub-3.14*bore**2/4*hub)/1e9*7850;
  Object.assign(v,{Hub_OD:od,Hub_ID:bore,Flg_Thk:th,Hub_Len:hub,Flange_wt:vbString(vbDouble(String(v.Flange_wt??0),state.culture)+kg,state.culture)});
  // The source computes a weight string but deliberately clears Label2.
  writeCell(state.legacyBuffers,1,row,9,String(imperial?(row>14?12:9):(row>14?305:229)));
  const bolts=vbString(vbRound(vbVal(a(39+fi))*Number(v.WeightFactor),2),state.culture);
  view.headers=[String(v.DN)+a(Number(v.ListCol))+v.ListUnitsSign+v.NPS+' '+v.Title+' '+v.ASMEClass+' '+v.Face,'','S/Bolts and Nuts =  '+bolts+' '+v.WeightSign,v.Face==='RTJ'?'RTJ Ring No : '+a(15):'',v.Face==='RTJ'?'RTJ Distance Between Flgs : '+a(16)+v.Inchsign:'','StudBolt Size : '+a(21)+'" UNC  (or M'+a(26)+')  x '+a(22+fi)+v.Inchsign+' Long',String(v.ActivitySpecLong)];
  view.textResults={status:'available',rows:[{id:'bolts-weight',label:'S/Bolts and Nuts =  ',value:bolts,unit:String(v.WeightSign)}]};
  view.drawing=buildDisplayList(state,catalog.template(v.Face==='RTJ'?'Flan/Flan7a.dxf':'Flan/Flan7.dxf'),catalog,{width:1067,height:690});
  return {state,view,trace,evidenceIds:['route:Flan7']};
}
export const Flan7:FeatureRoute={id:'Flan7',apply(state,_action,catalog){try{return apply(state,catalog);}catch(error){return recoverRecipeError(state,catalog,error);}}};
