'use client';
import {useCallback,useId,useLayoutEffect,useRef,useState} from 'react';
import type {ComponentProps} from 'react';
import type {PublicDrawing} from '../shared/public-contracts';
import {LegacyCanvas} from './LegacyCanvas';
import {maximumDrawingZoom} from './drawing-layout';
import type {DrawingDetail} from './drawing-layout';

type Point={x:number;y:number};
export function Viewport({drawing,asset,visible,revision,primaryCommandIndices}:{
  drawing:PublicDrawing;asset?:ComponentProps<typeof LegacyCanvas>['asset'];visible:boolean;revision:number;primaryCommandIndices?:number[];
}){
  const scroll=useRef<HTMLDivElement>(null),surface=useRef<HTMLDivElement>(null);
  const [size,setSize]=useState({width:0,height:0}),[scale,setScale]=useState(1);
  const [pan,setPan]=useState({x:0,y:0});
  const [mode,setMode]=useState<'primary'|'overview'>(primaryCommandIndices?.length?'primary':'overview');
  const [detailState,setDetail]=useState<{drawing:PublicDrawing;revision:number;mode:'primary'|'overview';width:number;height:number;value:DrawingDetail|null}>();
  const [primaryState,setPrimary]=useState<{drawing:PublicDrawing;revision:number;available:boolean}>();
  const [reading,setReading]=useState(false);
  const detail=detailState?.drawing===drawing&&detailState.revision===revision&&detailState.mode===mode&&detailState.width===size.width&&detailState.height===size.height?detailState.value:null;
  const primaryAvailable=primaryState?.drawing===drawing&&primaryState.revision===revision?primaryState.available:!!primaryCommandIndices?.length;
  const hintId=useId();
  const receiveDetail=useCallback((next:DrawingDetail|null)=>setDetail(old=>old?.drawing===drawing&&old.revision===revision&&old.mode===mode&&old.width===size.width&&old.height===size.height&&JSON.stringify(old.value)===JSON.stringify(next)?old:{drawing,revision,mode,width:size.width,height:size.height,value:next}),[drawing,revision,mode,size.width,size.height]);
  const receivePrimary=useCallback((available:boolean)=>setPrimary(old=>old?.drawing===drawing&&old.revision===revision&&old.available===available?old:{drawing,revision,available}),[drawing,revision]);
  const current=useRef(1),points=useRef(new Map<number,Point>());
  const position=useRef<{left:number;top:number}|null>(null);
  const pendingRead=useRef(false);

  useLayoutEffect(()=>{
    const el=scroll.current!;
    const measure=()=>{
      const width=el.clientWidth,height=el.clientHeight;
      if(width>0&&height>0)setSize(old=>old.width===width&&old.height===height?old:{width,height});
    };
    const observer=new ResizeObserver(measure);observer.observe(el);measure();
    return()=>observer.disconnect();
  },[]);
  function selectView(next:'primary'|'overview'){
    const el=scroll.current;
    const captured=[...points.current.keys()];points.current.clear();
    for(const id of captured)if(el?.hasPointerCapture(id))el.releasePointerCapture(id);
    current.current=1;position.current={left:0,top:0};setScale(1);setPan({x:0,y:0});
    setMode(next);setReading(false);
    pendingRead.current=false;
    if(el){el.scrollLeft=0;el.scrollTop=0;}
  }
  function reset(){selectView('overview');}
  useLayoutEffect(()=>{selectView(primaryCommandIndices?.length?'primary':'overview');},[drawing,revision,visible,primaryCommandIndices]);
  useLayoutEffect(()=>{if(!primaryAvailable&&mode==='primary')selectView('overview');},[primaryAvailable,mode]);
  useLayoutEffect(()=>{
    if(pendingRead.current&&mode==='primary'&&detail){pendingRead.current=false;applyDetail();}
  },[detail,mode]);
  useLayoutEffect(()=>{
    const el=scroll.current;if(!el)return;
    const target=position.current??{left:(el.scrollWidth-el.clientWidth)/2,top:(el.scrollHeight-el.clientHeight)/2};
    el.scrollLeft=target.left;el.scrollTop=target.top;position.current=null;
    setPan(old=>old.x===el.scrollLeft&&old.y===el.scrollTop?old:{x:el.scrollLeft,y:el.scrollTop});
  },[size,scale,mode]);
  useLayoutEffect(()=>{
    if(reading&&detail&&Math.abs(current.current-detail.zoom)>0.000001)zoom(detail.zoom,undefined,undefined,true);
  },[reading,detail]);

  function zoom(next:number,x?:number,y?:number,keepReading=false){
    const el=scroll.current;if(!el||!visible||!drawing.commands.length)return;
    const value=Math.min(maximumDrawingZoom,Math.max(1,next)),old=current.current;
    if(!Number.isFinite(value)||value===old)return;
    if(!keepReading){setReading(false);pendingRead.current=false;}
    const px=x??el.clientWidth/2,py=y??el.clientHeight/2;
    const before=position.current??{left:el.scrollLeft,top:el.scrollTop};
    position.current={left:(before.left+px)*value/old-px,top:(before.top+py)*value/old-py};
    current.current=value;setScale(value);
  }
  function applyDetail(){
    if(!detail)return;
    position.current={left:Math.max(0,detail.focus.x*detail.zoom-size.width/2),top:Math.max(0,detail.focus.y*detail.zoom-size.height/2)};
    current.current=detail.zoom;setScale(detail.zoom);setReading(true);
    const el=scroll.current;
    if(el&&scale===detail.zoom){el.scrollLeft=position.current.left;el.scrollTop=position.current.top;setPan({x:el.scrollLeft,y:el.scrollTop});position.current=null;}
  }
  const ready=size.width>48&&size.height>48,available=visible&&drawing.commands.length>0&&ready;
  return <section className="drawing-viewport" aria-label="Drawing viewport">
    <div className="viewport-tools">
      <button type="button" aria-label="Zoom out" disabled={!available||scale<=1} onClick={()=>zoom(current.current/1.25)}>−</button>
      <output aria-label="Zoom">{Math.round(scale*100)}%</output>
      <button type="button" aria-label="Zoom in" disabled={!available||scale>=maximumDrawingZoom} onClick={()=>zoom(current.current*1.25)}>+</button>
      <button type="button" disabled={!available||!primaryAvailable} aria-pressed={mode==='primary'&&primaryAvailable} onClick={()=>selectView('primary')}>Primary view</button>
      <button type="button" disabled={!available||!detail} onClick={()=>{
        if(!detail)return;
        if(primaryAvailable&&mode!=='primary'){selectView('primary');pendingRead.current=true;}
        else applyDetail();
      }}>Read dimensions</button>
      <button type="button" aria-label="Reset view" onClick={reset}>All views / reset</button>
      <output aria-label="Drawing view">{mode==='primary'&&primaryAvailable?'Primary view':'All views'}</output>
    </div>
    {reading&&detail?.requiresPan&&<p className="viewport-hint" role="status">Readable dimensions need more space. Drag or swipe to inspect the rest; All views / reset shows the complete drawing.</p>}
    <p className="viewport-hint" id={hintId}>Scroll to move down the page. Zoom in to inspect the drawing; drag with the mouse or swipe to pan, and pinch with two fingers to zoom.</p>
    <div className="workspace-scroll" ref={scroll} tabIndex={0} aria-label="Pan engineering layout" aria-describedby={hintId}
      onScroll={e=>{const el=e.currentTarget;setPan({x:el.scrollLeft,y:el.scrollTop});}}
      onKeyDown={e=>{
        if(e.target!==e.currentTarget)return;
        if(e.key==='+'||e.key==='='){e.preventDefault();zoom(current.current*1.25);}
        else if(e.key==='-'){e.preventDefault();zoom(current.current/1.25);}
        else if(e.key==='Home'){e.preventDefault();reset();}
        else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
          const el=e.currentTarget,x=e.key==='ArrowLeft'?-60:e.key==='ArrowRight'?60:0,y=e.key==='ArrowUp'?-60:e.key==='ArrowDown'?60:0;
          if((x<0&&el.scrollLeft>0)||(x>0&&el.scrollLeft+el.clientWidth<el.scrollWidth)||(y<0&&el.scrollTop>0)||(y>0&&el.scrollTop+el.clientHeight<el.scrollHeight)){
            e.preventDefault();el.scrollBy(x,y);
          }
        }
      }}
      onPointerDown={e=>{
        if(!available||e.button!==0||points.current.size>=2)return;
        if(!(e.target instanceof HTMLCanvasElement)&&e.target!==e.currentTarget&&e.target!==surface.current)return;
        if(e.pointerType!=='touch'){e.preventDefault();e.currentTarget.focus({preventScroll:true});}
        e.currentTarget.setPointerCapture(e.pointerId);points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
      }}
      onPointerMove={e=>{
        const previous=points.current.get(e.pointerId);if(!previous)return;
        const before=[...points.current.values()];points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
        const after=[...points.current.values()];
        if(after.length===2){
          const distance=(p:Point[])=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),old=distance(before);
          if(old>0){const rect=e.currentTarget.getBoundingClientRect();zoom(current.current*distance(after)/old,(after[0].x+after[1].x)/2-rect.left,(after[0].y+after[1].y)/2-rect.top);}
        }else if(e.pointerType!=='touch'){e.currentTarget.scrollLeft-=e.clientX-previous.x;e.currentTarget.scrollTop-=e.clientY-previous.y;}
      }}
      onPointerUp={e=>points.current.delete(e.pointerId)} onPointerCancel={e=>points.current.delete(e.pointerId)} onLostPointerCapture={e=>points.current.delete(e.pointerId)}>
      <div className="drawing-surface" ref={surface} style={{width:size.width*scale,height:size.height*scale}}>
        {available&&<LegacyCanvas drawing={drawing} asset={asset} presentation={{...size,padding:24,zoom:scale,offset:pan,primaryCommandIndices,focusMode:mode}} onDetail={receiveDetail} onPrimaryAvailable={receivePrimary}/>}
      </div>
    </div>
  </section>;
}
