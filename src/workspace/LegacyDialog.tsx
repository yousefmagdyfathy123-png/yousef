'use client';
import { useEffect,useRef,useState } from 'react';
import type { PublicDialog,PublicWorkAction,SearchHit } from '../shared/public-contracts';
import { searchStatusMessage, type SearchStatus } from './search-state';
export function dialogAction(dialog:PublicDialog,values:Record<string,string>):PublicWorkAction|undefined{
  if(dialog.id==='configuration')return {type:'configure',units:values.Units as 'Metric'|'Imperial',listUnits:values.ListUnits as 'Inches'|'Millimetres',temperature:values.DegUnits as 'Celsius'|'Fahrenheit',fractions:values.Fractionize==='Yes'};
  if(dialog.id==='search')return {type:'search',query:values.query??''};
  if(dialog.id==='flexibility'&&dialog.fieldId)return {type:'input',fieldId:dialog.fieldId,raw:values[dialog.fieldId]??''};
}
export function LegacyDialog({dialog,busy,hits,messages,onAction,onClose,onSearch,searchStatus='idle'}:{dialog:PublicDialog;busy:boolean;hits:SearchHit[];messages:string[];onAction:(a:PublicWorkAction)=>Promise<boolean>;onClose:()=>void;onSearch?:(query:string)=>void;searchStatus?:SearchStatus}){
  const ref=useRef<HTMLDialogElement>(null),[values,setValues]=useState<Record<string,string>>(()=>Object.fromEntries(dialog.controls.map(c=>[c.id,c.value])));
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;ref.current?.showModal();return()=>{ref.current?.close();previous?.focus();};},[]);
  return <dialog ref={ref} className={dialog.id==='search'?'search-dialog':undefined} aria-labelledby="legacy-dialog-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
    <form onSubmit={async e=>{e.preventDefault();if(busy)return;const a=dialogAction(dialog,values);if(a?.type==='search'&&onSearch){onSearch(a.query);return;}if(a&&await onAction(a)&&dialog.id!=='search')onClose();}}>
      <h2 id="legacy-dialog-title">{dialog.title}</h2>
      {messages.map((m,i)=><p key={i} role="alert">{m}</p>)}
      {dialog.controls.map(c=><label key={c.id}>{c.text}{c.options.length?<select aria-label={c.text} disabled={busy} value={values[c.id]} onChange={e=>setValues({...values,[c.id]:e.target.value})}>{c.options.map(o=><option key={o.value} value={o.value}>{o.text}</option>)}</select>:<input aria-label={c.text} disabled={busy} value={values[c.id]} onChange={e=>setValues({...values,[c.id]:e.target.value})}/>}</label>)}
      {dialog.blocks.map((text,i)=><p key={i} className="document-block">{text}</p>)}
      {dialog.id==='search'&&<>
        <p role="status" aria-live="polite" aria-atomic="true">{searchStatusMessage(searchStatus)}</p>
        <ul className="search-results" aria-label="Search results" aria-busy={searchStatus==='loading'}>{(searchStatus==='success'?hits:[]).map(h=><li key={h.id}><button type="button" disabled={busy} onClick={async()=>{if(await onAction({type:'select-route',routeId:h.id}))onClose();}}><span className="search-result-title">{h.text}</span>{h.context&&<> <span className="search-result-context">{h.context}</span></>}</button></li>)}</ul>
      </>}
      <div className="dialog-actions">{dialogAction(dialog,values)&&<button type="submit" disabled={busy}>{dialog.id==='search'?'Find':'Apply'}</button>}<button type="button" disabled={busy} onClick={onClose}>{dialog.controls.length?'Cancel':'Close'}</button></div>
    </form>
  </dialog>;
}
