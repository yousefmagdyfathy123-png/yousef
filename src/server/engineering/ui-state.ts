import 'server-only';
import type { WorkResult,WorkState } from '../../legacy/contracts';
import titles from '../../legacy/state/title-data.json';
import source from '../../legacy/ui/source-data.json';
const groups:Record<string,{routes:Record<string,string>}>=titles;
export type WorkspaceUiState={width:number;navigationVisible:boolean;comboVisible:boolean;toolsVisible:boolean;tabFamily:string;selectedTabId:string};
function normal(state:WorkState):WorkspaceUiState{
  const family=state.routeId.slice(0,4),routes=groups[family]?.routes;
  if(!routes)throw new Error('Workspace UI state upgrade required');
  const width=['Gflt','Gspr'].includes(family)?400:['Gpas','Ftsw','Ftsc','Blnu','Vlbw','Flbx'].includes(family)?275:family.startsWith('Srr')?270:220;
  const multiple=Number(state.values.TabbQty)>1;
  return {width,navigationVisible:multiple,comboVisible:multiple,toolsVisible:state.routeId!=='Gpas4',tabFamily:family,selectedTabId:routes[state.routeId]?state.routeId:''};
}
export function workspaceUiState(state:WorkState):WorkspaceUiState{
  const v=state.values;
  if(!Object.hasOwn(v,'UiNavigationWidth'))return normal(state);
  if(typeof v.UiNavigationWidth!=='number'||![220,270,275,400].includes(v.UiNavigationWidth)||typeof v.UiNavigationVisible!=='boolean'||typeof v.UiComboVisible!=='boolean'||typeof v.UiToolsVisible!=='boolean'||typeof v.UiTabFamily!=='string'||typeof v.UiSelectedTabId!=='string'||!groups[v.UiTabFamily]||v.UiSelectedTabId!==''&&!groups[v.UiTabFamily].routes[v.UiSelectedTabId])throw new Error('Invalid workspace UI state');
  return {width:Number(v.UiNavigationWidth),navigationVisible:v.UiNavigationVisible,comboVisible:v.UiComboVisible,toolsVisible:v.UiToolsVisible,tabFamily:v.UiTabFamily,selectedTabId:v.UiSelectedTabId};
}
/** Source GetTitle precedes recipes; only GotoForm invokes SortNavigationButtons.
 * WhiteBlock and no-dispatch therefore retain prior strip widths/arrow images.
 * These scalar host fields are private codec state, never browser state. */
export function advanceWorkspaceUi(previous:WorkState,result:WorkResult):void{
  const passive=result.trace.some(t=>t.operation==='Find'||t.operation==='input-validation');
  const noDispatch=result.trace.some(t=>t.operation==='no-dispatch');
  const white=result.view.textResults?.status==='unavailable';
  let next:WorkspaceUiState;
  if(passive||white||noDispatch){
    if(!previous.legacySession?.lastView)throw new Error('Workspace UI state upgrade required');
    next=workspaceUiState(previous);
    if(!passive){
      const family=result.state.routeId.slice(0,4);
      if(groups[family]){
        next.tabFamily=family;next.selectedTabId=groups[family].routes[result.state.routeId]?result.state.routeId:'';
        next.comboVisible=(source.familyTitleVisibility as Record<string,boolean>)[family]??next.comboVisible;
      }
    }
  }else next=normal(result.state);
  Object.assign(result.state.values,{UiNavigationWidth:next.width,UiNavigationVisible:next.navigationVisible,UiComboVisible:next.comboVisible,UiToolsVisible:next.toolsVisible,UiTabFamily:next.tabFamily,UiSelectedTabId:next.selectedTabId});
}
