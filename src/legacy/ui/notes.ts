import type { Catalog } from '../contracts';
import { referenceUseNotice as engineeringNotice } from '../../shared/product-information';
export { referenceUseNotice as engineeringNotice } from '../../shared/product-information';

export type LegacyDocument={id:string;title:string;blocks:string[]};
const assets:Record<string,{asset:string;title:string}>={
  material:{asset:'Gensets/Parameters.txt',title:'Material'},
  'parameters-metric':{asset:'Gensets/ParametersMetric.txt',title:'Rack Span Parameters'},
  'parameters-imperial':{asset:'Gensets/ParametersImperial.txt',title:'Rack Span Parameters'},
  'parameters-process-metric':{asset:'Gensets/ParametersProcessAreaSpansM.txt',title:'Process Area Span Parameters'},
  'parameters-process-imperial':{asset:'Gensets/ParametersProcessAreaSpansI.txt',title:'Process Area Span Parameters'},
};
const entities:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
function decode(text:string):string{return text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi,(whole,key:string)=>{
  if(key[0]!=='#')return entities[key.toLowerCase()]??whole;
  const code=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));
  return code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):'\uFFFD';
});}
/** Text blocks only: never HTML, URLs, event attributes, CSS or embedded assets. */
export function sanitizeLegacyHtml(html:string):string[]{
  return decode(html.replace(/<!--[\s\S]*?(?:-->|$)/g,'').replace(/<(script|style|iframe|object|head)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi,'')
    .replace(/<\/?(?:p|div|br|h[1-6]|li|tr)\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,''))
    .split(/\r?\n/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
}
export function getLegacyDocument(id:string,catalog:Catalog):LegacyDocument{
  if(id!=='about'&&!Object.hasOwn(assets,id))throw new Error('Unknown workspace document');
  const reader=catalog as Catalog&{asset?:(id:string)=>Uint8Array};if(!reader.asset)throw new Error('Catalog document reader is unavailable');
  if(id==='about'){
    const source=sanitizeLegacyHtml(new TextDecoder('windows-1252').decode(reader.asset('Gensets/Pipedata-Pro.html'))).join(' ');
    const units=source.match(/Dimension and Weight units can be set to Metric or U\.S\. Customary Units\./)?.[0];
    if(!units)throw new Error('Product information source changed');
    return {id,title:'Alfadata',blocks:[units,engineeringNotice]};
  }
  const doc=assets[id],text=new TextDecoder('utf-8').decode(reader.asset(doc.asset)).replace(/^\uFEFF/,'');
  return {id,title:doc.title,blocks:text.split(/\r?\n/).map(line=>line.trimEnd()).filter(line=>line.trim().length>0)};
}
