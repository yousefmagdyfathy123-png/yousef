'use client';
import { useLayoutEffect,useRef,useState } from 'react';
import type { PublicWorkResult,PublicLegacyView } from '../shared/public-contracts';
import { LegacyCanvas } from './LegacyCanvas';
import { canvasFont } from './render-canvas';
import { engineeringControlLabels } from './control-labels';
export { referenceUseNotice } from '../shared/product-information';

// Presentation is deliberately separate: preserve every source byte of data.
export function printSnapshot(result:PublicWorkResult):PublicWorkResult{return structuredClone(result);}
export function LegacyHeaders({view}:{view:PublicLegacyView}){
  return <>{view.headers.map((text,i)=>view.visibility['Label'+(i+1)]!==false&&<div key={i} data-header={i+1} className={'legacy-header legacy-header-'+(i+1)}>{text}</div>)}</>;
}
export async function preparePrintFonts(snapshot:PublicWorkResult,element:HTMLElement|null){
  const samples=new Map<string,string>();
  for(const command of snapshot.view.drawing.commands)if(command.op==='text'){
    const font=canvasFont(command.font);samples.set(font,(samples.get(font)??'')+command.text);
  }
  // Request header fonts too, including fonts used only by the offscreen sheet.
  for(const node of element?.querySelectorAll('h1,p,dt,dd')??[]){
    const style=getComputedStyle(node),font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    samples.set(font,(samples.get(font)??'')+node.textContent);
  }
  await Promise.all([...samples].map(([font,text])=>document.fonts.load(font,text)));
  await document.fonts.ready;
  // Font completion causes both the header and canvas metrics to be recomputed.
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
}
export function PrintView({snapshot}:{snapshot:PublicWorkResult}){
  const sheet=useRef<HTMLElement>(null),stage=useRef<HTMLDivElement>(null);
  const [size,setSize]=useState({width:273*96/25.4,height:500});
  useLayoutEffect(()=>{
    const measure=()=>{
      const rect=stage.current?.getBoundingClientRect();
      if(rect&&rect.width>24&&rect.height>24)setSize(old=>old.width===rect.width&&old.height===rect.height?old:{width:rect.width,height:rect.height});
    };
    measure();const observer=new ResizeObserver(measure);
    if(sheet.current)observer.observe(sheet.current);
    if(stage.current)observer.observe(stage.current);
    document.fonts.addEventListener('loadingdone',measure);window.addEventListener('beforeprint',measure);
    return()=>{observer.disconnect();document.fonts.removeEventListener('loadingdone',measure);window.removeEventListener('beforeprint',measure);};
  },[snapshot]);
  const {view,ui}=snapshot;
  const title=view.visibility.Label1!==false&&view.headers[0]?view.headers[0]:ui?.titleText||'Engineering drawing';
  const available=view.visibility.drawing!==false&&view.textResults?.status!=='unavailable';
  const parameters=view.controls.filter(control=>control.visible);
  return <section ref={sheet} className="print-view" aria-label="Print snapshot" data-print-revision={snapshot.revision}>
    <header className="print-identity">
      <h1>{title}</h1>
      {ui?.titleText&&ui.titleText!==title&&<p className="print-component">{ui.titleText}</p>}
      <dl>{parameters.map(control=><div key={control.id}><dt>{engineeringControlLabels[control.id]??control.id}</dt><dd>{control.text}</dd></div>)}
        {ui&&<><div><dt>Units</dt><dd>{ui.settings.units}</dd></div><div><dt>Size units</dt><dd>{ui.settings.listUnits}</dd></div><div><dt>Temperature</dt><dd>{ui.settings.temperature}</dd></div><div><dt>Fractions</dt><dd>{ui.settings.fractions?'On':'Off'}</dd></div></>}
      </dl>
      {view.messages.map((message,i)=><p className="print-message" key={i}>{message}</p>)}
      {!available&&!view.messages.length&&<p className="print-message">Drawing unavailable for this selection.</p>}
    </header>
    <div ref={stage} className="print-drawing">{available&&<LegacyCanvas drawing={view.drawing} presentation={{...size,padding:12,zoom:1}}/>}</div>
  </section>;
}
