import type { LegacyView, WorkState, WorkResult, Catalog } from '../contracts';
import type { RouteRegistry } from '../registry';
import { readCell } from './buffers';
import { applyDefaultSettings, saveSettings } from './settings';
import { transition } from './transition-core';
import { drawingTransform } from '../drawing/transform';
export type UnavailableKind = 'size-class-face-schedule' | 'size-class-face' | 'size-class' | 'size-rating' | 'size-valve-class' | 'size-schedule';
export function unavailableView(view: LegacyView, title: string, kind: UnavailableKind,state?:WorkState): LegacyView {
  const next=structuredClone(view), hints:Record<UnavailableKind,string>={
    'size-class-face-schedule':'Select another size, class, face type or Schedule',
    'size-class-face':'Try another size, class or face type','size-class':'Try another size or class','size-rating':'Try another size or rating',
    'size-valve-class':'Try another size or Valve Class','size-schedule':'Try another size or Schedule'};
  next.headers=[title,'Not manufactured with the selected parameters',hints[kind],'','','',''];
  next.textResults={status:'unavailable',rows:[]};
  if(state)next.drawing.transform=drawingTransform(state,next.drawing);
  next.drawing.commands=[{op:'fillRect',x:-200,y:-200,width:next.drawing.width*3,height:next.drawing.height*3,color:'#ffffff'}];
  Object.assign(next.visibility,{Label1:true,Label2:true,Label3:true});return next;
}
export function recoverLegacyError(state: WorkState, catalog: Catalog, registry: RouteRegistry, sourceId: string): WorkResult {
  const next=structuredClone(state);applyDefaultSettings(next);next.routeId='Flan1';applyDefaultSettings(next);saveSettings(next);
  const result=transition(next,{type:'select-route',routeId:'Flan1'},catalog,registry);
  result.view.messages.unshift(`Alfadata has encountered a problem at ${sourceId} and needs to re-set using the default settings. We are sorry for the inconvenience.`);
  result.state.legacySession!.lastView=structuredClone(result.view);
  result.trace.unshift({operation:'ErrorCatch',sourceId});return result;
}
export function sensorUnavailable(state: WorkState, sensors: {bank:number;row:number;column:number}[]): boolean {
  return sensors.some(s=>{const value=readCell(state.legacyBuffers,s.bank,s.row,s.column);return value===null||value===''||value==='N/A';});
}
