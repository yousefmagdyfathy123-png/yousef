import type { Catalog, WorkAction, WorkState, WorkResult } from '../contracts';
import type { RouteRegistry } from '../registry';
import { registerRoutes } from '../registry';
import { assertLegacyCulture } from '../vb/culture';
import { loadSettings, saveSettings, applyDefaultSettings, integerFields, numberFields, savedFields } from './settings';
import { configureState } from './configure';
import { searchCatalog } from './search';
import { recoverLegacyError } from './errors';
import { vbVal, vbRound } from '../vb/numbers';
import { encodeWorkState } from './codec';
import { validateLegacyView } from './view-schema';
import { applySharedChecks, getSharedOptions } from './checks';
import { loadTitle } from './titles';
import { applyLegacyInput } from './inputs';
function requireRoute(id:string,registry:RouteRegistry):void {
  const kind=registry.classify(id);
  if(kind==='unknown')throw new Error('Unknown engineering route');
  if(kind==='pending')throw new Error(`Required route implementation pending: ${id}`);
}
function appendHistory(s:WorkState):void {
  if(!s.history.ids.includes(s.routeId)) {s.history.ids.push(s.routeId);if(s.history.ids.length===11)s.history.ids.shift();s.history.index=s.history.ids.length-1;}
}
export function transition(state:WorkState,action:WorkAction,catalog:Catalog,registry:RouteRegistry=registerRoutes([])):WorkResult {
  assertLegacyCulture(state.culture);
  if(!state.legacySession)throw new Error('State schema upgrade required');
  encodeWorkState(state);
  if(!Number.isSafeInteger(state.revision)||state.revision<0||state.revision===Number.MAX_SAFE_INTEGER)throw new Error('Invalid workspace revision');
  if(!['select-route','select-option','configure','input','back','forward','reset','search'].includes(action.type))throw new Error('Invalid engineering action');
  let next=structuredClone(state);const trace:WorkResult['trace']=[];
  if(action.type==='search'){
    if(!next.legacySession!.lastView)throw new Error('Workspace display has not been initialized');
    try {
      const hits=searchCatalog(action.query,catalog,next.culture);
      next.values.SearchString=action.query;next.revision++;
      return {state:next,view:structuredClone(next.legacySession!.lastView),searchHits:hits,evidenceIds:['state:search'],trace:[{operation:'Find',sourceId:'Gensets/SearchFile.csv'}]};
    } catch(error) {
      if(error instanceof Error && error.name==='ArgumentException') {next.values.SearchString=action.query;return recoverLegacyError(next,catalog,registry,next.routeId);}
      throw error;
    }
  }
  if(action.type==='select-route')next.routeId=action.routeId;
  if(action.type==='back'||action.type==='forward'){
    next.history.index=Math.max(0,Math.min(next.history.ids.length-1,next.history.index+(action.type==='back'?-1:1)));
    next.routeId=next.history.ids[next.history.index];
  }
  requireRoute(next.routeId,registry);
  if(action.type==='select-route')next.values['SavedTab_'+next.routeId.slice(0,4)]=next.routeId;
  if(action.type==='select-option'){
    const control=next.legacySession!.lastView?.controls.find(c=>c.id===action.controlId);
    const option=control?.options.find(o=>o.value===action.value);
    const selectable=savedFields.includes(action.controlId)||(next.routeId.startsWith('Vlfl')&&action.controlId==='Actuator');
    if(!control?.enabled||!control.visible||!option?.enabled||!selectable)throw new Error('Selection is not available');
    next.values[action.controlId]=numberFields.has(action.controlId)?(integerFields.has(action.controlId)?vbRound(vbVal(action.value),0):vbVal(action.value)):action.value;
    saveSettings(next);
  }
  if(action.type==='input'){
    const control=next.legacySession!.lastView?.controls.find(c=>c.id===action.fieldId&&c.type==='input');
    if(!control?.enabled||!control.visible)throw new Error('Input is not available');
    const input=applyLegacyInput(next,action.fieldId,action.raw);next=input.state;
    if(!input.ok){
      const view=structuredClone(state.legacySession.lastView!);view.messages=input.messages;
      next.revision=state.revision+1;next.legacySession!.lastView=structuredClone(view);
      validateLegacyView(view);encodeWorkState(next);
      return {state:next,view,trace:[{operation:'input-validation',sourceId:'frmDataInput_Fxly.Button4_Click'}],evidenceIds:['dialog:frmDataInput_Fxly']};
    }
  }
  if(action.type==='configure')configureState(next,action,catalog);
  if(action.type==='reset'){applyDefaultSettings(next);saveSettings(next);}
  appendHistory(next);trace.push({operation:'LoadTabList',sourceId:'Clicker'});
  loadSettings(next);trace.push({operation:'LoadSettings',sourceId:next.routeId});
  loadTitle(next);trace.push({operation:'GetTitle',sourceId:next.routeId});
  if(next.legacySession!.lastView)applySharedChecks(next,next.legacySession!.lastView);
  trace.push({operation:'AddChecks',sourceId:next.routeId});
  getSharedOptions(next);trace.push({operation:'DesigClassFaceSchRatingEtc',sourceId:next.routeId});
  let result:WorkResult;
  const route=registry.get(next.routeId);
  if(route){
    // Route implementations own their source-specific error boundary; missing handlers never recover as fake success.
    result=route.apply(next,action,catalog);
    if(!result.state.legacySession)throw new Error('Invalid route state ownership');
    assertLegacyCulture(result.state.culture);requireRoute(result.state.routeId,registry);encodeWorkState(result.state);
    trace.push(...result.trace);
  } else {
    const old=next.legacySession!.lastView;
    if(!old)throw new Error('No prior display exists for source no-dispatch route');
    result={state:next,view:structuredClone(old),evidenceIds:[],trace:[]};
    trace.push({operation:'no-dispatch',sourceId:next.routeId});
  }
  validateLegacyView(result.view);
  const committed=structuredClone(result.state);
  committed.revision=state.revision+1;committed.legacySession!.lastView=structuredClone(result.view);encodeWorkState(committed);
  return {...result,state:committed,view:structuredClone(result.view),trace};
}
export function replay(initial:WorkState,actions:WorkAction[],catalog:Catalog,registry:RouteRegistry=registerRoutes([])):WorkResult {
  if(!actions.length){if(!initial.legacySession?.lastView)throw new Error('Workspace display has not been initialized');return {state:structuredClone(initial),view:structuredClone(initial.legacySession.lastView),evidenceIds:[],trace:[]};}
  let result:WorkResult|undefined;
  for(const action of actions)result=transition(result?.state??initial,action,catalog,registry);
  return result!;
}
