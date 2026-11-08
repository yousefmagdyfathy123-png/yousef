import { tableRecipe } from '../table-recipe';
import type { TableRecipe } from '../table-recipe';
import { cell } from '../recipe-view';
import { vbRound,vbVal } from '../../vb/numbers';
import { vbString } from '../../vb/strings';
import { writeCell } from '../../state/buffers';
export interface StrainerRecipe extends TableRecipe {weights:number[]}
export function strainerRoute(p:StrainerRecipe){return tableRecipe(p,(state,view)=>{
  const v=state.values,a=(col:number,row=Number(v.MainSize))=>cell(state,col,1,row),id=p.id;
  const size=String(v.DN)+a(id==='Srra4'?1:Number(v.ListCol))+v.ListUnitsSign+v.NPS;
  view.headers=[size+' '+v.Title+(p.fields.includes('ASMEClass')?' '+v.ASMEClass:''),'','','','Strainers are not standardized,','averaged dimensions are used.',String(v.ActivitySpecLong)];
  const rows=p.weights.map((col,i)=>{
    const value=vbString(vbRound(vbVal(a(col))*Number(v.WeightFactor),2),state.culture),label=i===0?'Weight = ':'Weight Long Option = ';
    view.headers[i+1]=label+value+(id==='Srrc1'||id==='Srrd1'?' ':'')+v.WeightSign;
    return {id:i===0?'weight':'weight-long',label,value,unit:String(v.WeightSign)};
  });
  view.textResults={status:'available',rows};
  if(id==='Srra1')writeCell(state.legacyBuffers,1,Number(v.MainSize),10,a(6)+'" NPT Drain');
  if(id==='Srrd1')writeCell(state.legacyBuffers,1,Number(v.MainSize),14,String(v.DN)+a(Number(v.ListCol),12)+v.ListUnitsSign+v.NPS);
});}
