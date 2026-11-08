import { test, expect, type Page } from '@playwright/test';
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { ComponentProps } from 'react';
import type { LegacyCanvas } from '../../src/workspace/LegacyCanvas';

type Props = ComponentProps<typeof LegacyCanvas>;
declare global { interface Window { mountCanvas: (props: Props) => void; canvasProps: Props; strokeOrigin?: number } }
let script: string;
const drawing: Props['drawing'] = {width:100,height:100,transform:[.5,0,0,.5,10,10],commands:[
  {op:'line',from:{x:-150,y:-50},to:{x:120,y:60},width:2,color:'#000000'},
  {op:'text',x:-150,y:-50,text:'Ø 1½ / 45° — complete dimension',font:'18px serif',align:'right',verticalAlign:'bottom',color:'#000000'},
  {op:'text',x:120,y:60,text:'Bottom view',font:'18px serif',align:'left',color:'#000000'},
]};
const presentation = {width:480,height:240,padding:24,zoom:1};

test.beforeAll(async()=>{
  const bundle=await build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import {LegacyCanvas} from './src/workspace/LegacyCanvas'; const root=createRoot(document.getElementById('root')); window.mountCanvas=props=>root.render(<LegacyCanvas {...props}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'browser',format:'iife',write:false,jsx:'automatic'});
  script=bundle.outputFiles[0].text;
});
async function mount(page:Page,props:Props){
  await page.route('**/__drawing-fixture',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('/__drawing-fixture');
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({content:script});
  await page.evaluate(props=>{window.canvasProps=props;window.mountCanvas(props);},props);
  await expect(page.getByLabel('Engineering drawing')).toBeVisible();
}
async function pixels(page:Page){
  return page.getByLabel('Engineering drawing').evaluate(element=>{
    const canvas=element as HTMLCanvasElement,ctx=canvas.getContext('2d')!;
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let left=canvas.width,right=-1,top=canvas.height,bottom=-1;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
      const i=(y*canvas.width+x)*4;
      if(data[i+3]&&Math.min(data[i],data[i+1],data[i+2])<220){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    }
    return {left,right,top,bottom,width:canvas.width,height:canvas.height,cssWidth:canvas.style.width,cssHeight:canvas.style.height};
  });
}

for(const dpr of [1,2])test(`fitted labels remain complete and sharp at DPR ${dpr}, resize and zoom`,async({browser,baseURL},info)=>{
  const context=await browser.newContext({baseURL,deviceScaleFactor:dpr});
  try{
    const page=await context.newPage();
    await mount(page,{drawing,presentation});
    for(const size of [presentation,{width:260,height:400,padding:24,zoom:2}]){
      await page.evaluate(props=>window.mountCanvas(props),{drawing,presentation:size});
      await expect.poll(async()=> (await pixels(page)).width).toBe(size.width*size.zoom*dpr);
      const ink=await pixels(page),margin=size.padding*size.zoom*dpr;
      expect(ink.cssWidth).toBe(size.width*size.zoom+'px');
      expect(ink.cssHeight).toBe(size.height*size.zoom+'px');
      expect(ink.left).toBeGreaterThanOrEqual(margin-2);expect(ink.right).toBeLessThan(ink.width-margin+2);
      expect(ink.top).toBeGreaterThanOrEqual(margin-2);expect(ink.bottom).toBeLessThan(ink.height-margin+2);
      expect(ink.right).toBeGreaterThan(ink.left);
      expect(Math.abs((ink.left+ink.right)/2-ink.width/2)).toBeLessThan(5*dpr);
      await page.getByLabel('Engineering drawing').screenshot({path:info.outputPath(`fitted-${size.width}-dpr${dpr}.png`)});
    }
    await page.evaluate(props=>window.mountCanvas(props),{drawing:{...drawing,commands:[]},presentation});
    await expect.poll(async()=> (await pixels(page)).right).toBe(-1);
  }finally{await context.close();}
});

// Independent source fixtures pin text, masks and endpoints. Deliberately keep
// tiny but complete labels visible in evidence; completeness is not readability.
for (const [family, route, units] of [
  ['flanges-gaskets','Flan1','Metric'], ['flanges-gaskets','Flan1','Imperial'],
  ['flanges-gaskets','Gflt1','Metric'], ['calculators','Span1','Metric'],
  ['valves-strainers-fasteners','Vlfl1','Imperial'],
] as const) test(`${route} ${units} real reference labels survive actual browser fitting`,async({page},info)=>{
  const fixture=JSON.parse(await readFile(`tests/reference/${family}/${route}.json`,'utf8'));
  const row=fixture.cases.find((c:any)=>(c.initial.Units??'Metric')===units);
  expect(row).toBeTruthy();
  const source=row.expected.view.drawing;
  if(source.geometryRef){source.commands.push(...fixture.geometries[source.geometryRef]);delete source.geometryRef;}
  const expected=source.commands.filter((c:any)=>c.op==='text').map((c:any)=>c.text);
  await page.addInitScript(()=>{
    const frames=new WeakMap<HTMLCanvasElement,string[]>();
    const fill=CanvasRenderingContext2D.prototype.fillRect,text=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillRect=function(x,y,w,h){
      const m=this.getTransform();
      if(m.b===0&&m.c===0&&m.e===0&&m.f===0&&x===0&&y===0)frames.set(this.canvas,[]);
      Reflect.apply(fill,this,[x,y,w,h]);
    };
    CanvasRenderingContext2D.prototype.fillText=function(value,x,y,maxWidth?){
      frames.get(this.canvas)?.push(value);
      Reflect.apply(text,this,maxWidth===undefined?[value,x,y]:[value,x,y,maxWidth]);
    };
    (window as any).replayedLabels=(canvas:HTMLCanvasElement)=>frames.get(canvas);
  });
  await mount(page,{drawing:source,presentation});
  for(const [width,height] of [[390,844],[844,390],[1024,768],[1440,900]]){
    await page.setViewportSize({width,height});
    await page.evaluate(props=>window.mountCanvas(props),{drawing:source,presentation:{width:width-48,height:Math.min(height-80,600),padding:24,zoom:1}});
    await expect.poll(()=>page.getByLabel('Engineering drawing').evaluate(el=>(window as any).replayedLabels(el))).toEqual(expected);
    const ink=await pixels(page);
    expect(ink.left).toBeGreaterThanOrEqual(22);expect(ink.top).toBeGreaterThanOrEqual(22);
    expect(ink.right).toBeLessThan(ink.width-22);expect(ink.bottom).toBeLessThan(ink.height-22);
    await page.screenshot({path:info.outputPath(`${route}-${units}-${width}.png`)});
  }
  const record=info.outputPath('reference-selection.json');
  await writeFile(record,JSON.stringify({route,units,fixture:row.id,revision:null,initial:row.initial,headers:row.expected.view.headers,controls:row.expected.view.controls.map((c:any)=>({id:c.id,text:c.text})),sourceTransform:source.transform,viewports:[[390,844],[844,390],[1024,768],[1440,900]]},null,2));
  await info.attach('reference-selection',{path:record,contentType:'application/json'});
});

test('late font readiness refits actual glyph metrics and bounded zoom preserves finite backing size',async({page})=>{
  let release!:()=>void;
  const held=new Promise<void>(resolve=>{release=resolve;});
  const require=createRequire(import.meta.url);
  const font=await readFile(require.resolve('next/dist/next-devtools/server/font/geist-mono-latin.woff2'));
  await page.route('**/drawing-font.woff2',async route=>{await held;await route.fulfill({body:font,contentType:'font/woff2'});});
  await mount(page,{drawing,presentation});
  await page.addStyleTag({content:"@font-face {font-family: DrawingDelayed;src:url('/drawing-font.woff2')}"});
  const delayed={...drawing,commands:[{op:'text' as const,x:0,y:0,text:'iiiiiiiiiiiiiiii / 45°',font:'30px DrawingDelayed, serif',align:'left' as const,color:'#000000'}]};
  await page.evaluate(props=>window.mountCanvas(props),{drawing:delayed,presentation});
  await expect.poll(async()=>(await pixels(page)).right).toBeGreaterThan(0);
  const before=await page.getByLabel('Engineering drawing').evaluate(el=>(el as HTMLCanvasElement).toDataURL());
  release();
  await page.evaluate(async()=>{await document.fonts.load('30px DrawingDelayed');await document.fonts.ready;});
  await expect.poll(()=>page.getByLabel('Engineering drawing').evaluate(el=>(el as HTMLCanvasElement).toDataURL())).not.toBe(before);
  const ink=await pixels(page);expect(ink.left).toBeGreaterThanOrEqual(23);expect(ink.right).toBeLessThan(457);
  await page.evaluate(props=>window.mountCanvas(props),{drawing:delayed,presentation:{...presentation,zoom:1000}});
  await expect.poll(()=>page.getByLabel('Engineering drawing').evaluate(el=>(el as HTMLCanvasElement).style.width)).toBe('7680px');
});

test('asset revision invalidation clears resolved geometry even when the result object is reused',async({page})=>{
  const asset={id:'workspace-test',revision:1,binding:{tabId:'tab',bindingRevision:1,recoveryGeneration:'generation'}};
  await page.route('**/api/workspaces/workspace-test/assets/drawing',route=>route.fulfill({json:drawing,headers:{'X-Workspace-Revision':'1'}}));
  await mount(page,{drawing,presentation,asset});
  await expect(page.getByLabel('Engineering drawing')).toHaveAttribute('data-drawing-source','asset');
  await page.evaluate(()=>window.mountCanvas({...window.canvasProps,asset:{...window.canvasProps.asset!,revision:2}}));
  await expect(page.getByLabel('Engineering drawing')).toHaveAttribute('data-drawing-source','result');
  await page.evaluate(props=>window.mountCanvas(props),{drawing:{...drawing,commands:[]},presentation,asset});
  await expect.poll(async()=>(await pixels(page)).right).toBe(-1);
});

test('late asset response cannot repaint an empty selection',async({page})=>{
  let requested!:()=>void,release!:()=>void;
  const received=new Promise<void>(resolve=>{requested=resolve;});
  const held=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/workspaces/workspace-test/assets/drawing',async route=>{
    requested();await held;
    await route.fulfill({json:drawing,headers:{'X-Workspace-Revision':'1'}}).catch(()=>{});
  });
  const asset={id:'workspace-test',revision:1,binding:{tabId:'tab',bindingRevision:1,recoveryGeneration:'generation'}};
  await mount(page,{drawing,presentation,asset});await received;
  await page.evaluate(props=>window.mountCanvas(props),{drawing:{...drawing,commands:[]},presentation,asset});
  await expect.poll(async()=>(await pixels(page)).right).toBe(-1);
  release();
  // A frame after delivery catches asynchronous asset publication/repaint.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  expect((await pixels(page)).right).toBe(-1);
  await expect(page.getByLabel('Engineering drawing')).toHaveAttribute('data-drawing-source','result');
});

test('fitting measures the resolved asset instead of the fallback result drawing',async({page})=>{
  const assetDrawing={...drawing,commands:[{op:'line' as const,from:{x:1000,y:-500},to:{x:1000,y:500},width:2,color:'#000000'}]};
  await page.route('**/api/workspaces/workspace-test/assets/drawing',route=>route.fulfill({json:assetDrawing,headers:{'X-Workspace-Revision':'1'}}));
  await mount(page,{drawing,presentation,asset:{id:'workspace-test',revision:1,binding:{tabId:'tab',bindingRevision:1,recoveryGeneration:'generation'}}});
  await expect(page.getByLabel('Engineering drawing')).toHaveAttribute('data-drawing-source','asset');
  const ink=await pixels(page);
  expect(ink.right-ink.left).toBeLessThan(4);
  expect(ink.bottom-ink.top).toBeGreaterThan(180);
  expect(Math.abs((ink.left+ink.right)/2-240)).toBeLessThan(2);
  expect(ink.top).toBeGreaterThanOrEqual(23);
  expect(ink.bottom).toBeLessThan(217);
});

test('runtime DPR changes repaint backing pixels and large zoom stays within the raster budget',async({page,context,browserName})=>{
  test.skip(browserName!=='chromium','Runtime device emulation uses Chromium CDP');
  await mount(page,{drawing,presentation});
  const session=await context.newCDPSession(page);
  await session.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:2,mobile:false});
  expect(await page.evaluate(()=>devicePixelRatio)).toBe(2);
  await expect.poll(async()=>(await pixels(page)).width).toBe(960);
  await page.evaluate(props=>window.mountCanvas(props),{drawing,presentation:{width:3000,height:2000,padding:24,zoom:3}});
  await expect.poll(()=>page.getByLabel('Engineering drawing').evaluate(el=>(el as HTMLCanvasElement).style.width)).toBe('9000px');
  const size=await page.getByLabel('Engineering drawing').evaluate(el=>{const c=el as HTMLCanvasElement;return {width:c.width,height:c.height};});
  expect(size.width*size.height).toBeLessThanOrEqual(16_010_000);
  expect(Math.max(size.width,size.height)).toBeLessThanOrEqual(8192);
});

test('sub-1 DPR reserves a full device hairline radius when padding is zero',async({browser,baseURL})=>{
  const context=await browser.newContext({baseURL,deviceScaleFactor:.5});
  try{
    const page=await context.newPage();
    await mount(page,{drawing,presentation});
    await page.evaluate(()=>{
      const stroke=CanvasRenderingContext2D.prototype.stroke;
      CanvasRenderingContext2D.prototype.stroke=function(){window.strokeOrigin=this.getTransform().e;Reflect.apply(stroke,this,[]);};
    });
    const hairline={...drawing,commands:[{op:'line' as const,from:{x:0,y:0},to:{x:100,y:100},width:0,color:'#000000'}]};
    await page.evaluate(props=>window.mountCanvas(props),{drawing:hairline,presentation:{width:100,height:100,padding:0,zoom:1}});
    await expect.poll(()=>page.evaluate(()=>window.strokeOrigin)).toBeGreaterThanOrEqual(.5);
  }finally{await context.close();}
});
