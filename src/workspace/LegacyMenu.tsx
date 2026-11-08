'use client';
import {useEffect,useRef} from 'react';
import type { PublicWorkspaceUi,PublicUiEffect } from '../shared/public-contracts';
export function LegacyMenu({ui,busy,onEffect}:{ui:PublicWorkspaceUi;busy:boolean;onEffect:(e:PublicUiEffect)=>void}){
  const menu=useRef<HTMLElement>(null);
  useEffect(()=>{
    const closeOutside=(event:Event)=>{
      const root=menu.current;
      if(!root||!(event.target instanceof Node)||root.contains(event.target))return;
      for(const details of root.querySelectorAll<HTMLDetailsElement>('details[open]'))details.open=false;
    };
    document.addEventListener('pointerdown',closeOutside,true);
    document.addEventListener('focusin',closeOutside);
    return()=>{document.removeEventListener('pointerdown',closeOutside,true);document.removeEventListener('focusin',closeOutside);};
  },[]);
  const byId=new Map(ui.items.map(item=>[item.id,item]));
  function item(id:string,seen:string[]=[]):React.ReactNode{
    const c=byId.get(id);if(!c?.visible||seen.includes(id))return null;
    const children=c.children.filter(child=>byId.get(child)?.visible);
    if(children.length)return <details key={id} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus();}}}>
      <summary aria-disabled={!c.enabled||busy} onClick={e=>{if(!c.enabled||busy)e.preventDefault();}}>{c.text.replaceAll('&','')}</summary><div className="legacy-menu-children">{children.map(child=>item(child,[...seen,id]))}</div></details>;
    return <button key={id} type="button" disabled={busy||!c.enabled} aria-pressed={c.checked} onClick={e=>{e.currentTarget.focus();onEffect(c.effect);let parent=e.currentTarget.closest('details');let summary:HTMLElement|null=null;while(parent){parent.open=false;summary=parent.querySelector('summary');parent=parent.parentElement?.closest('details')??null;}summary?.focus();}}>{c.text.replaceAll('&','')}</button>;
  }
  const root=byId.get('MenuStrip1');
  return <nav ref={menu} className="legacy-menu" aria-label="Engineering menu">{root?.children.map(id=>item(id))}
    {['ToolStripButton9','ToolStripButton15','ToolStripButton17'].map(id=>{const c=byId.get(id);return c?.visible?<button key={id} type="button" disabled={busy||!c.enabled} onClick={e=>{e.currentTarget.focus();onEffect(c.effect);}}>{c.text||({ToolStripButton9:'Settings',ToolStripButton15:'Find',ToolStripButton17:'Print'}[id])}</button>:null;})}
  </nav>;
}
