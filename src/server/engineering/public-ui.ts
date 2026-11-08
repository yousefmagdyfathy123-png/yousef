import 'server-only';
import type { Catalog,WorkState } from '../../legacy/contracts';
import { getLegacyMenu,handleLegacyUiEvent } from '../../legacy/ui/menus';
import { getLegacyDialog } from '../../legacy/ui/dialogs';
import { getLegacyDocument,engineeringNotice } from '../../legacy/ui/notes';
import source from '../../legacy/ui/source-data.json';
import titles from '../../legacy/state/title-data.json';
import { publicActionSchema,publicUiSchema } from '../../shared/public-schemas';
import type { PublicUiEffect,PublicWorkspaceUi } from '../../shared/public-contracts';
import { workspaceUiState } from './ui-state';

/** Server-only composition. No source model, catalog or source paths enter the client bundle. */
export function projectWorkspaceUi(state:WorkState,catalog?:Catalog):PublicWorkspaceUi{
  const controls=getLegacyMenu(state);
  const host=workspaceUiState(state);
  const effect=(id:string):PublicUiEffect=>{
    const event=source.events.find(e=>e.controlId===id&&['Click','LinkClicked'].includes(e.event));
    if(!event)return {kind:'none'};
    // A source no-dispatch route keeps the previous TabArray. Event handlers
    // still navigate that array, even though ActiveTab has a stale search id.
    let eventState=state;
    if(!groups[state.routeId.slice(0,4)]&&['navigate','subtab'].includes(event.action.kind)){
      eventState=structuredClone(state);eventState.routeId=host.selectedTabId||Object.keys(groups[host.tabFamily].routes)[0];
    }
    const e=handleLegacyUiEvent(eventState,event.id);
    if(e.kind==='work')return {kind:'work',action:publicActionSchema.parse(e.action)};
    if(e.kind==='host'&&(e.operation==='print'||e.operation==='close'))return {kind:'host',operation:e.operation};
    if(e.kind!=='dialog')return {kind:'none'};
    const d=getLegacyDialog(e.dialog,state,e.fieldId);
    const blocks=d.documentId?(catalog?getLegacyDocument(d.documentId,catalog).blocks:d.documentId==='about'?[engineeringNotice]:[]):[];
    return {kind:'dialog',dialog:{id:d.id,title:d.title,blocks:blocks.map(x=>x),
      controls:d.controls.map(c=>({id:c.id,text:c.text,value:c.value,options:c.options.map(o=>({value:o.value,text:o.text}))})),
      ...(d.fieldId?{fieldId:d.fieldId}:{})}};
  };
  const groups:Record<string,{routes:Record<string,string>}>=titles;
  const label=(id:string,text:string)=>{
    // Source history items have DisplayStyle.Image; their designer Text is never visible.
    if(id==='ToolStripMenuItem1')return 'Forward';
    if(id==='ToolStripMenuItem2')return 'Back';
    if(id==='LinkLabel1'&&/^Span[12]$/.test(state.routeId))return state.routeId==='Span1'?'Rack Span parameters':'Process Area Span parameters';
    return /^ToolStripButton/.test(id)?((source.controls as Record<string,{ToolTipText?:string}>)[id]?.ToolTipText??text):text;
  };
  return publicUiSchema.parse({routeId:state.routeId,selectedTabId:host.selectedTabId,titleText:String(state.values.Title??''),navigationWidth:host.width,settings:{units:state.values.Units,listUnits:state.values.ListUnits==='Inches'?'Inches':'Millimetres',temperature:state.values.DegUnits,fractions:state.values.Fractionize==='Yes'},
    tabs:Object.entries(groups[host.tabFamily]?.routes??{}).map(([id,text])=>({id,text})),
    items:controls.map(c=>({id:c.id,text:label(c.id,c.text),enabled:c.id==='ToolStripMenuItem1'?state.history.index<state.history.ids.length-1:c.id==='ToolStripMenuItem2'?state.history.index>0:c.enabled,checked:c.checked,
      visible:c.id==='LinkLabel1'?state.legacySession?.lastView?.visibility.LinkLabel1===true:c.id==='Combo1'?host.comboVisible:/^ToolStripButton[1-4]$/.test(c.id)?host.navigationVisible:['ToolStripButton9','ToolStripButton15','ToolStripButton17'].includes(c.id)?host.toolsVisible:c.visible,
      layout:c.id==='LinkLabel1'?{x:11,y:state.routeId==='Span1'?578:603,width:158,height:17}:{x:c.layout.x,y:c.layout.y,width:c.layout.width,height:c.layout.height},
      children:c.options.map(o=>o.value),effect:effect(c.sourceId)}))});
}
