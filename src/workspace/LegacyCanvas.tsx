'use client';
import { useEffect,useLayoutEffect,useRef,useState } from 'react';
import type { PublicDrawing } from '../shared/public-contracts';
import { publicDrawingSchema } from '../shared/public-schemas';
import { fetchWorkspaceAsset, type WorkspaceAssetBinding } from './asset-transport';
import { canvasFont, renderCanvas } from './render-canvas';
import { fitDrawing, measureDrawingBounds, resolveDrawingFocus, drawingDetail, maximumDrawingZoom } from './drawing-layout';
import type { DrawingDetail } from './drawing-layout';
type Asset = {id:string;revision:number;binding:WorkspaceAssetBinding};
export type DrawingPresentation = {width:number;height:number;padding:number;zoom:number;offset?:{x:number;y:number};primaryCommandIndices?:number[];focusMode?:'primary'|'overview'};
export function LegacyCanvas({drawing,asset,presentation,onDetail,onPrimaryAvailable}:{drawing:PublicDrawing;asset?:Asset;presentation?:DrawingPresentation;onDetail?:(detail:DrawingDetail|null)=>void;onPrimaryAvailable?:(available:boolean)=>void}){
  const canvas=useRef<HTMLCanvasElement>(null);
  const [derived,setDerived]=useState<{source:PublicDrawing;drawing:PublicDrawing;id:string;revision:number|undefined;binding:WorkspaceAssetBinding;matches:boolean}>();
  const id=asset?.id,revision=asset?.revision,binding=asset?.binding;
  useEffect(()=>{
    if(!id||!binding||!drawing.commands.length)return;
    const controller=new AbortController();
    void fetchWorkspaceAsset(id,'drawing',binding,controller.signal).then(async response=>{
      if(!response.ok||response.headers.get('X-Workspace-Revision')!==String(revision))return;
      const validated=publicDrawingSchema.parse(await response.json());
      if(!controller.signal.aborted)setDerived({source:drawing,drawing:validated,id,revision,binding,matches:JSON.stringify(validated.commands)===JSON.stringify(drawing.commands)});
    }).catch(()=>{});
    return()=>controller.abort();
  },[id,revision,binding,drawing]);
  const rendered=derived?.source===drawing&&derived.id===id&&derived.revision===revision&&derived.binding===binding&&drawing.commands.length?derived.drawing:drawing;
  const indices=rendered===drawing||derived?.matches?presentation?.primaryCommandIndices:undefined;
  const focusMode=presentation?.focusMode;
  const width=presentation?.width,height=presentation?.height,padding=presentation?.padding,zoom=presentation?.zoom;
  const offsetX=presentation?.offset?.x,offsetY=presentation?.offset?.y;
  useLayoutEffect(()=>{
    let active=true;
    const draw=()=>{
      const ctx=canvas.current?.getContext('2d');
      if(!active||!ctx)return;
      const magnification=Number.isFinite(zoom)?Math.min(maximumDrawingZoom,Math.max(1,zoom!)):1;
      const virtualSize=width!==undefined&&height!==undefined
        ?{width:width*magnification,height:height*magnification}:rendered;
      // Screen zoom keeps a virtual scroll surface, painting only its visible tile.
      // Print and callers without offsets retain the complete-sheet canvas.
      const size=offsetX!==undefined&&width!==undefined&&height!==undefined?{width,height}:virtualSize;
      // At most 16M backing pixels (~64 MB), with no edge exceeding 8192.
      // Normal screen/print sizes retain native DPR, including zoomed output.
      const dpr=Math.min(window.devicePixelRatio||1,Math.sqrt(16_000_000/(size.width*size.height)),8192/size.width,8192/size.height);
      let fitted:PublicDrawing|undefined;
      if(padding!==undefined){
        const hasHairlines=rendered.commands.some(command=>command.op==='line'&&command.width===0);
        const inset=hasHairlines?Math.max(padding*magnification,.5/dpr):padding*magnification;
        const primary=resolveDrawingFocus(ctx,rendered,indices);
        onPrimaryAvailable?.(!!primary);
        const bounds=focusMode==='primary'&&primary?primary.bounds:measureDrawingBounds(ctx,rendered);
        fitted=fitDrawing(rendered,bounds,virtualSize,inset);
        if(onDetail&&width!==undefined&&height!==undefined){
          const fittedBase=fitDrawing(rendered,bounds,{width,height},padding);
          const detailDrawing=primary?{...rendered,commands:indices!.map(i=>rendered.commands[i])}:rendered;
          onDetail(drawingDetail(detailDrawing,fittedBase.transform,primary?.bounds??bounds??undefined,{width,height}));
        }
        if(offsetX!==undefined){
          fitted={...fitted,...size,transform:[...fitted.transform]};
          fitted.transform[4]-=offsetX;fitted.transform[5]-=offsetY??0;
        }
      }
      renderCanvas(ctx,rendered,dpr,fitted);
    };
    draw();
    const fonts=document.fonts;
    // load() also requests fonts used only by canvas (no DOM text element).
    const fontSamples=new Map<string,string>();
    for(const command of rendered.commands)if(command.op==='text')fontSamples.set(canvasFont(command.font),(fontSamples.get(canvasFont(command.font))??'')+command.text);
    void Promise.allSettled([...fontSamples].map(([font,text])=>fonts.load(font,text))).then(()=>fonts.ready).then(()=>{if(active)draw();});
    fonts.addEventListener('loadingdone',draw);
    let resolution:MediaQueryList;
    let watchedDpr=window.devicePixelRatio||1;
    const watchDpr=()=>{
      resolution?.removeEventListener('change',onDpr);
      watchedDpr=window.devicePixelRatio||1;
      resolution=window.matchMedia(`(resolution: ${watchedDpr}dppx)`);
      resolution.addEventListener('change',onDpr);
    };
    const onDpr=()=>{draw();watchDpr();};
    watchDpr();
    // Some browser/device-emulation changes update DPR without a resize or
    // media-query event. Check cheaply; repaint only when the ratio changes.
    const dprCheck=window.setInterval(()=>{if((window.devicePixelRatio||1)!==watchedDpr)onDpr();},1000);
    window.addEventListener('resize',draw);
    return()=>{active=false;window.clearInterval(dprCheck);fonts.removeEventListener('loadingdone',draw);resolution.removeEventListener('change',onDpr);window.removeEventListener('resize',draw);};
  },[rendered,width,height,padding,zoom,offsetX,offsetY,onDetail,onPrimaryAvailable,indices,focusMode]);
  return <canvas ref={canvas} aria-label="Engineering drawing" data-drawing-source={rendered===drawing?'result':'asset'}/>;
}
