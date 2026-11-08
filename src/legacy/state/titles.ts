import type { WorkState } from '../contracts';
import data from './title-data.json';
type TitleSet={ActivitySpec:string;ActivitySpecLong:string;ActivityTitle:string;routes:Record<string,string>};
export function loadTitle(state:WorkState):void {
  const title=(data as Record<string,TitleSet>)[state.routeId.slice(0,4)];
  state.values.ActivitySpec=title?.ActivitySpec??'';state.values.ActivitySpecLong=title?.ActivitySpecLong??'';state.values.ActivityTitle=title?.ActivityTitle??'';
  if(title?.routes[state.routeId]!==undefined)state.values.Title=title.routes[state.routeId];
}
