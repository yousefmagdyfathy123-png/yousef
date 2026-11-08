import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LegacyView,SourceRef } from '../../src/legacy/contracts';
// Read golden JSON as data, avoiding huge generated JS literals/TS ASTs. No
// rounding, projection or normalization is applied to independently authored data.
export type FlangeReferenceCase={id:string;sourceRefs:SourceRef[];culture:'en-US';initial:Record<string,string|number>;actions:{type:'select-route';routeId:string}[];expected:{view:LegacyView;mainSize:number;lineCounts:number[];files:string[];bankFingerprint:string;available:boolean;sourceHashes:string[];sourceValues?:Record<string,string|number>;savedValues?:Record<string,string|number>}};
export function loadFlangeCases(routeId:string):FlangeReferenceCase[]{
  if(!/^[A-Za-z][A-Za-z0-9]*$/.test(routeId))throw new Error('Invalid reference id');
  const fixture=JSON.parse(readFileSync(resolve('tests/reference/flanges-gaskets',routeId+'.json'),'utf8')) as {cases:FlangeReferenceCase[]};
  return fixture.cases;
}
