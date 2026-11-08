import type { Catalog,WorkResult } from '../../legacy/contracts';
import type { PublicWorkResult } from '../../shared/public-contracts';
import { parsePublicWorkResult } from '../../shared/public-schemas';
import { projectWorkspaceUi } from './public-ui';
import { drawingPresentation } from './drawing-presentation';
import { searchContext } from '../../shared/search-context';
export function toPublicWorkResult(workspaceId:string,result:WorkResult,catalog?:Catalog):PublicWorkResult{
  try{
  const view=result.view;
  const visibility:Record<string,boolean>={};for(const key of ['Label1','Label2','Label3','Label4','Label5','Label6','Label7','drawing'])if(Object.hasOwn(view.visibility,key))visibility[key]=view.visibility[key];
  const dto:PublicWorkResult={workspaceId,revision:result.state.revision,inputAccepted:!result.trace.some(t=>t.operation==='input-validation'),view:{
    headers:view.headers.map(x=>x),messages:view.messages.map(x=>x),visibility,
    controls:view.controls.map(c=>({id:c.id,type:c.type,text:c.text,enabled:c.enabled,checked:c.checked,visible:c.visible,layout:{x:c.layout.x,y:c.layout.y,width:c.layout.width,height:c.layout.height},options:c.options.map(o=>({value:o.value,text:o.text,enabled:o.enabled}))})),
    drawing:{width:view.drawing.width,height:view.drawing.height,transform:view.drawing.transform.map(x=>x),commands:view.drawing.commands.map(c=>{
      if(c.op==='line')return {op:c.op,from:{x:c.from.x,y:c.from.y},to:{x:c.to.x,y:c.to.y},color:c.color,width:c.width};
      if(c.op==='fillRect')return {op:c.op,x:c.x,y:c.y,width:c.width,height:c.height,color:c.color};
      const text:{op:'text';text:string;x:number;y:number;font:string;align:'left'|'center'|'right';color:string;verticalAlign?:'top'|'bottom'}={op:c.op,text:c.text,x:c.x,y:c.y,font:c.font,align:c.align,color:c.color};
      if(c.verticalAlign!==undefined)text.verticalAlign=c.verticalAlign;return text;
    })},
  }};
  if(view.textResults)dto.view.textResults={status:view.textResults.status,rows:view.textResults.rows.map(r=>({id:r.id,label:r.label,value:r.value,unit:r.unit,...(r.kind!==undefined?{kind:r.kind}:{})}))};
  const presentation=drawingPresentation(result.state.routeId,dto.view.drawing);
  if(presentation)dto.view.presentation=presentation;
  if(result.state.routeId&&result.state.values)dto.ui=projectWorkspaceUi(result.state,catalog);
  if(result.searchHits)dto.searchHits=result.searchHits.map(h=>({id:h.id,text:h.text,context:searchContext(h.id)}));
  return parsePublicWorkResult(dto);
  }catch{throw new Error('Invalid public work result');}
}
