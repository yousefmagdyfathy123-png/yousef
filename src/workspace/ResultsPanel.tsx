'use client';
import { useEffect,useRef,useState } from 'react';
import type { PublicTextResults } from '../shared/public-contracts';
export function resultsText(results:PublicTextResults|undefined):string{
  if(!results||results.status==='unavailable')return 'No results available for the selected parameters.';
  return ['Result\tValue\tUnit',...results.rows.map(r=>[r.label,r.value,r.unit].join('\t'))].join('\n');
}
export function ResultsPanel({results,revision,messages,headers=[]}:{results:PublicTextResults|undefined;revision:number;messages:string[];headers?:string[]}){
  const [status,setStatus]=useState(''),committed=useRef(revision);
  committed.current=revision;
  useEffect(()=>{setStatus('');},[revision]);
  async function copy(text:string){
    const version=revision;
    try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(text);if(committed.current===version)setStatus('Copied.');}
    catch{if(committed.current===version)setStatus('Copy was unavailable. Select the result text and copy it manually.');}
  }
  const hasRoles=results?.rows.some(r=>r.kind!==undefined);
  return <details className="results-panel" open><summary>Results</summary><div data-results-revision={revision}>
    {messages.map((m,i)=><p key={i} role="status">{m}</p>)}
    {!results||results.status==='unavailable'?<><p role="status">{headers.filter(Boolean).join('\n')}</p><p>No results available for the selected parameters.</p></>:<>
      <button type="button" onClick={()=>void copy(resultsText(results))}>Copy all results</button>
      <table><caption>Displayed engineering results</caption><thead><tr><th scope="col">Result</th><th scope="col">Value</th><th scope="col">Unit</th>{hasRoles&&<th scope="col">Type</th>}<th scope="col">Copy</th></tr></thead><tbody>
        {results.rows.map(r=><tr key={r.id}><th scope="row">{r.label}</th><td>{r.value}</td><td>{r.unit}</td>{hasRoles&&<td>{r.kind==='input'?'Input':r.kind==='output'?'Output':'Result'}</td>}<td><button type="button" aria-label={'Copy '+r.label} onClick={()=>void copy([r.label,r.value,r.unit].join('\t'))}>Copy</button></td></tr>)}
      </tbody></table></>}
    <p role="status" aria-live="polite">{status}</p>
  </div></details>;
}
