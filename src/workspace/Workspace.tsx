'use client';
import { useEffect,useId,useRef,useState } from 'react';
import { flushSync } from 'react-dom';
import type { PublicWorkAction,PublicWorkResult,PublicDialog,PublicUiEffect,SearchHit } from '../shared/public-contracts';
import { parsePublicWorkResult } from '../shared/public-schemas';
import { LegacyMenu } from './LegacyMenu';
import { LegacyDialog } from './LegacyDialog';
import { LegacySearch } from './LegacySearch';
import type { SearchStatus } from './search-state';
import type { WorkspaceAssetBinding } from './asset-transport';
import { ResultsPanel } from './ResultsPanel';
import { Viewport } from './Viewport';
import { PrintView,printSnapshot,preparePrintFonts,referenceUseNotice } from './PrintView';
import { engineeringControlLabel } from './control-labels';
import './workspace.css';
export function Workspace({initial,onAction,onSearch,binding,actionsBlocked=false,embedded=false}:{
  initial:PublicWorkResult;onAction:(action:PublicWorkAction)=>Promise<PublicWorkResult>;actionsBlocked?:boolean;embedded?:boolean;
  onSearch?:(query:string,signal:AbortSignal)=>Promise<SearchHit[]>;
  binding?:WorkspaceAssetBinding;
}){
  const [result,setResult]=useState(()=>parsePublicWorkResult(initial)),[working,setBusy]=useState(false),[error,setError]=useState('');
  const Root=embedded?'div':'main';
  const [dialog,setDialog]=useState<PublicDialog|null>(null),[snapshot,setSnapshot]=useState<PublicWorkResult|null>(null);
  const [searchStatus,setSearchStatus]=useState<SearchStatus>('idle');
  const controlPrefix=useId();
  const busy=working||actionsBlocked||!!snapshot;
  const capture=useRef<PublicWorkResult|null>(null),printAttempt=useRef(0);
  const current=useRef(result),locked=useRef(false),printing=useRef(false),mounted=useRef(true);
  const printStarted=useRef(false),printFocus=useRef<HTMLElement|null>(null);
  function finishPrint(){
    printing.current=false;printStarted.current=false;capture.current=null;printAttempt.current++;
    // Re-enable the originating control before restoring focus.
    flushSync(()=>setSnapshot(null));printFocus.current?.focus();printFocus.current=null;
  }
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;printAttempt.current++;};},[]);
  useEffect(()=>{
    const before=()=>{
      printFocus.current??=document.activeElement as HTMLElement|null;
      printing.current=true;printStarted.current=true;
      capture.current??=printSnapshot(current.current);
      flushSync(()=>setSnapshot(capture.current));
    };
    const after=()=>finishPrint();
    const media=window.matchMedia('print'),change=(event:MediaQueryListEvent)=>{if(!event.matches)after();};
    window.addEventListener('beforeprint',before);window.addEventListener('afterprint',after);
    media.addEventListener('change',change);
    return()=>{window.removeEventListener('beforeprint',before);window.removeEventListener('afterprint',after);media.removeEventListener('change',change);};
  },[]);
  async function run(action:PublicWorkAction):Promise<boolean>{
    if(locked.current||printing.current||actionsBlocked)return false;locked.current=true;setBusy(true);setError('');
    if(action.type==='search'&&!onSearch)setSearchStatus('loading');
    const expected=current.current;
    try{
      const next=parsePublicWorkResult(await onAction(action));
      if(!mounted.current)return false;
      if(next.workspaceId!==expected.workspaceId||next.revision<=current.current.revision)throw new Error('Invalid engineering response');
      current.current=next;setResult(next);
      if(action.type==='search'&&!onSearch)setSearchStatus(next.inputAccepted===false?'error':next.searchHits?.length?'success':'empty');
      return next.inputAccepted!==false;
    }catch{if(mounted.current){setError('The engineering action could not be completed. Please try again.');if(action.type==='search'&&!onSearch)setSearchStatus('error');}return false;}
    finally{locked.current=false;if(mounted.current)setBusy(false);}
  }
  async function print(){
    if(locked.current||printing.current||actionsBlocked)return;
    printFocus.current=document.activeElement as HTMLElement|null;printStarted.current=false;
    const attempt=++printAttempt.current;
    const captured=printSnapshot(current.current);capture.current=captured;printing.current=true;
    flushSync(()=>setSnapshot(captured));setError('');
    try{
      await preparePrintFonts(captured,document.querySelector('.print-view'));
      if(!mounted.current||attempt!==printAttempt.current||!printing.current||printStarted.current)return;
      window.print();
      // A nonblocking print host retains the immutable snapshot until afterprint.
      if(!printStarted.current)finishPrint();
    }catch{
      if(!mounted.current||attempt!==printAttempt.current)return;
      finishPrint();setError('Printing could not be completed. Please try again.');
    }
  }
  function effect(e:PublicUiEffect){
    if(e.kind==='work')void run(e.action);
    else if(e.kind==='dialog'){if(e.dialog.id==='search')setSearchStatus('idle');setDialog(e.dialog);}
    else if(e.kind==='host'&&e.operation==='print')void print();
    else if(e.kind==='host'&&e.operation==='close')setError('You can close this workspace using your browser tab.');
  }
  const ui=result.ui,settings=ui?.settings??{units:'Metric' as const,listUnits:'Inches' as const,temperature:'Celsius' as const,fractions:false};
  const nav=(id:string)=>ui?.items.find(c=>c.id===id);
  return <Root><div className="workspace-screen"><div className="workspace-heading">{!embedded&&<h1>Alfadata</h1>}<label>Units <select aria-label="Units" disabled={busy||!!snapshot} value={settings.units} onChange={e=>void run({type:'configure',units:e.target.value as 'Metric'|'Imperial',listUnits:settings.listUnits,temperature:settings.temperature,fractions:settings.fractions})}><option>Metric</option><option>Imperial</option></select></label></div>
    {error&&<p role="alert">{error}</p>}
    {ui&&<LegacyMenu ui={ui} busy={busy||!!snapshot} onEffect={effect}/>}
      <section className="legacy-workspace screen-workspace" aria-label="Engineering workspace" aria-busy={busy} data-revision={result.revision}>
        <div className="engineering-toolbar">
        <nav className="legacy-navigation" aria-label="Component navigation">
          {(['ToolStripButton1','ToolStripButton2'] as const).map((id,i)=><button key={id} aria-label={i===0?'First component':'Previous component'} hidden={nav(id)?.visible===false} disabled={busy||!nav(id)?.enabled||nav(id)?.effect.kind==='none'} onClick={()=>nav(id)&&effect(nav(id)!.effect)}>{i===0?'«':'‹'}</button>)}
          <div className="engineering-control" hidden={ui?.items.find(c=>c.id==='Combo1')?.visible===false}>
            <label className="engineering-control-label" htmlFor={controlPrefix+'-component'} data-control-label={controlPrefix+'-component'}>Component</label>
            <select id={controlPrefix+'-component'} aria-label="Component" hidden={ui?.items.find(c=>c.id==='Combo1')?.visible===false} value={ui?.selectedTabId??''} disabled={busy||!ui?.items.find(x=>x.id==='Combo1')?.visible} onChange={e=>void run({type:'select-route',routeId:e.target.value})}>{ui?.selectedTabId===''&&<option value="" hidden>{ui.titleText}</option>}{ui?.tabs.map(t=><option key={t.id} value={t.id}>{t.text}</option>)}</select>
          </div>
          {(['ToolStripButton3','ToolStripButton4'] as const).map((id,i)=><button key={id} aria-label={i===0?'Next component':'Last component'} hidden={nav(id)?.visible===false} disabled={busy||!nav(id)?.enabled||nav(id)?.effect.kind==='none'} onClick={()=>nav(id)&&effect(nav(id)!.effect)}>{i===0?'›':'»'}</button>)}
        </nav>
        {result.view.controls.filter(c=>c.visible).map(c=>{
          const label=engineeringControlLabel(ui?.routeId??'',c.id),id=controlPrefix+'-'+c.id;
          // Length's existing accessible name is already correct and used by keyboard clients.
          const inputName=c.id==='Length'?'Length':label;
          const control=c.type==='input'
            ? <button id={id} type="button" className="legacy-selector" aria-label={inputName+': '+c.text} disabled={busy||!c.enabled} onClick={e=>{e.currentTarget.focus();const item=nav(c.id);if(item)effect(item.effect);}}>{c.text}</button>
            : c.options.length
              ? <select id={id} className="legacy-selector" aria-label={label} disabled={busy||!c.enabled} value={c.options.find(o=>o.text===c.text)?.value??''} onChange={e=>void run({type:'select-option',controlId:c.id,value:e.target.value})}>{c.options.map(o=><option key={o.value} value={o.value} disabled={!o.enabled}>{o.text}</option>)}</select>
              : <button id={id} type="button" className="legacy-selector" disabled={busy||!c.enabled} onClick={e=>{e.currentTarget.focus();const item=nav(c.id);if(item)effect(item.effect);}}>{c.text}</button>;
          return <div key={c.id} className="engineering-control"><label className="engineering-control-label" htmlFor={id} data-control-label={id}>{label}</label>{control}</div>;
        })}
        {ui?.items.filter(c=>c.id==='LinkLabel1'&&c.visible&&c.effect.kind!=='none').map(c=><button key={c.id} className="parameters-link" disabled={busy} onClick={e=>{e.currentTarget.focus();effect(c.effect);}}>{c.text}</button>)}
        </div>
        <div className="engineering-headers">
          {result.view.headers.map((text,i)=>text!==''&&result.view.visibility['Label'+(i+1)]!==false&&<div key={i} data-header={i+1} className={'legacy-header legacy-header-'+(i+1)}>{text}</div>)}
          {result.view.messages.map((message,i)=><p key={i} className="legacy-message">{message}</p>)}
        </div>
        <Viewport drawing={result.view.drawing} primaryCommandIndices={result.view.presentation?.primaryCommandIndices} asset={binding&&{id:result.workspaceId,revision:result.revision,binding}} visible={result.view.visibility.drawing!==false} revision={result.revision}/>
      </section>
    <ResultsPanel results={result.view.textResults} revision={result.revision} messages={result.view.messages} headers={result.view.headers}/>
    <details className="product-information"><summary>Product information</summary><p>{referenceUseNotice}</p></details>
    {dialog?.id==='search'&&onSearch
      ? <LegacySearch dialog={dialog} busy={busy} messages={result.view.messages} search={onSearch} onAction={run} onClose={()=>setDialog(null)}/>
      : dialog&&<LegacyDialog key={dialog.id+(dialog.fieldId??'')} dialog={dialog} busy={busy} messages={result.view.messages} hits={result.searchHits??[]} searchStatus={searchStatus} onAction={run} onClose={()=>setDialog(null)}/>}
  </div>{snapshot&&<PrintView snapshot={snapshot}/>}</Root>;
}
