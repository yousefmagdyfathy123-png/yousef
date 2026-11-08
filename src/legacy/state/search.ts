import type { Catalog, LegacyCulture, SearchHit } from '../contracts';
import { assertLegacyCulture } from '../vb/culture';
import { vbLike } from '../vb/like';
export function searchCatalog(query: string, catalog: Catalog, culture: LegacyCulture): SearchHit[] {
  assertLegacyCulture(culture);
  if(typeof query!=='string')throw new Error('Invalid search query');
  // Framework TextInfo performs simple casing; JS full casing expands e.g. sharp-s/fi ligature.
  const upper=(s:string)=>Array.from(s,c=>{const mapped=c.toLocaleUpperCase('en-US');return mapped.length===c.length?mapped:c;}).join('');
  const pattern=`*${upper(query)}*`, hits:SearchHit[]=[];
  for(const row of catalog.table('Gensets/SearchFile.csv').rows){
    if(row.length<6)throw new Error('Invalid private search table');
    // All four calls execute in source; a prior match never short-circuits a later error.
    const found=[1,2,3,4].map(c=>vbLike(upper(row[c]),pattern,culture));
    if(found.some(Boolean))hits.push({id:row[0],text:row[1]});
  }
  return hits;
}
