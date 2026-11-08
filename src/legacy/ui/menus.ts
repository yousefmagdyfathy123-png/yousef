import type { LegacyControl,WorkAction,WorkState } from '../contracts';
import { getSharedChecks } from '../state/checks';
import titles from '../state/title-data.json';
import data from './source-data.json';

type Properties={Text?:string;ToolTipText?:string;Enabled?:boolean;Visible?:boolean;Checked?:boolean};
const properties:Record<string,Properties>=data.controls;
const excluded=new Set(['mnuCheckForUpdates','ToolStripComboBox6','ToolStripTextBox3','ToolStripButton18','ToolStripButton19']);
const titleGroups:Record<string,{routes:Record<string,string>}>=titles;
function tabs(state:WorkState):[string,string][]{return Object.entries(titleGroups[state.routeId.slice(0,4)]?.routes??{});}

/** Private source menu model. React/host execution is consumed by Task11. */
export function getLegacyMenu(state:WorkState):LegacyControl[]{
  const checks=getSharedChecks(state).checked,subtabs=tabs(state);
  const roots=['MenuStrip1','ToolStrip1','ToolStrip2','ToolStrip3','StatusStrip1','StatusStrip2','StatusStrip3'];
  const result:LegacyControl[]=[],seen=new Set<string>();
  const visit=(id:string,parentVisible=true)=>{
    if(seen.has(id)||excluded.has(id))return;seen.add(id);
    const p=properties[id]??{},children=data.edges.find(e=>e.parent===id)?.children.filter(c=>!excluded.has(c))??[];
    const tab=/^Combo1_Tab(\d+)$/.exec(id),index=tab?Number(tab[1])-1:-1;
    const familyVisibility:Record<string,boolean>=data.familyTitleVisibility;
    const visible=parentVisible&&(id==='Combo1'?(familyVisibility[state.routeId.slice(0,4)]??p.Visible??true):(p.Visible??true))&&(!tab||index<subtabs.length);
    const source=state.legacySession?.lastView?.controls.find(c=>c.sourceId===id);
    const text=id==='Combo1'?String(state.values.Title??''):id==='ToolStripStatusLabel3'?'':id==='ToolStripStatusLabel4'?(state.values.Units==='Imperial'?'U.S. Customary Units':'Metric Units'):tab?(subtabs[index]?.[1]??''):(p.Text??p.ToolTipText??'');
    const menuChildren=id==='Combo1'?children.filter(child=>Number(child.replace('Combo1_Tab',''))<=subtabs.length):children;
    result.push(source?structuredClone(source):{id,sourceId:id,type:children.length?'menu':'menu-item',text,
      options:menuChildren.map(value=>({value,text:id==='Combo1'?(subtabs[Number(value.replace('Combo1_Tab',''))-1]?.[1]??''):(properties[value]?.Text??properties[value]?.ToolTipText??''),enabled:properties[value]?.Enabled??true})),
      enabled:p.Enabled??true,checked:checks[id]??p.Checked??false,visible,layout:{x:0,y:0,width:0,height:0},sourceRefs:data.edges.find(e=>e.parent===id)?.sourceRefs??[{...data.source,line:1}]});
    children.forEach(child=>visit(child,visible));
  };
  roots.forEach(id=>visit(id));
  // Some generated control strips have no Item.AddRange root; preserve their
  // constructed event identities and the recipe's current controls as well.
  for(const event of data.events)if(event.controlId!=='$form')visit(event.controlId);
  return result;
}

export type UiEffect={kind:'work';action:WorkAction}|{kind:'dialog';dialog:'about'|'configuration'|'search'|'parameters'|'flexibility';fieldId?:string;toggle?:boolean}
  |{kind:'none'}|{kind:'host';operation:string}|{kind:'blocked';reason:string};
const none:UiEffect={kind:'none'};
function select(routeId:string):UiEffect{return {kind:'work',action:{type:'select-route',routeId}};}
export function handleLegacyUiEvent(state:WorkState,eventId:string):UiEffect{
  const event=data.events.find(e=>e.id===eventId);if(!event)throw new Error('Unknown workspace event');
  const action=event.action,view=state.legacySession?.lastView;
  switch(action.kind){
    case 'empty':case 'dismiss':return none;
    case 'vendor-link':return {kind:'blocked',reason:'Vendor service is outside the Alfadata workspace.'};
    case 'family':{
      const family=String(action.family),saved=state.values['SavedTab_'+family];
      return select(typeof saved==='string'&&saved.startsWith(family)?saved:family+'1');
    }
    case 'route':return select(String(action.routeId));
    case 'subtab':{const tab=tabs(state)[Number(action.index)-1];return tab?select(tab[0]):none;}
    case 'navigate':{
      const count=Number(state.values.TabbCount),qty=Number(state.values.TabbQty),back=action.direction==='first'||action.direction==='previous';
      if(!Number.isFinite(count)||!Number.isFinite(qty)||(back?count<=1:count>=qty))return none;
      const available=tabs(state),next=action.direction==='first'?0:action.direction==='last'?qty-1:count-1+(back?-1:1);
      return available[next]?select(available[next][0]):none;
    }
    case 'history':return {kind:'work',action:{type:action.direction==='forward'?'forward':'back'}};
    case 'option':{
      const c=view?.controls.find(c=>c.sourceId===action.button),option=c?.options[Number(action.index)-1];
      if(!c?.visible||!c.enabled||!option?.enabled)return none;
      return {kind:'work',action:{type:'select-option',controlId:c.id,value:option.value}};
    }
    case 'input':{
      const c=view?.controls.find(c=>c.sourceId===action.button);
      if(!c?.visible||!c.enabled||c.type!=='input'||!/^Fxly[12]$/.test(state.routeId))return none;
      return {kind:'dialog',dialog:'flexibility',fieldId:c.id};
    }
    case 'dialog':
      if(action.dialog==='parameters'&&!/^Span[12]$/.test(state.routeId))return none;
      return {kind:'dialog',dialog:action.dialog as 'about'|'configuration'|'search'|'parameters',...(action.toggle?{toggle:true}:{})};
    case 'print':case 'close':return {kind:'host',operation:action.kind};
    case 'lifecycle':return action.event==='Click'?none:{kind:'host',operation:String(action.event)};
    default:throw new Error('Unclassified workspace event');
  }
}
