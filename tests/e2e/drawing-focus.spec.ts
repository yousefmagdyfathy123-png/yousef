import {test,expect,type Page} from '@playwright/test';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import type {ComponentProps} from 'react';
import type {Viewport} from '../../src/workspace/Viewport';
type Props=ComponentProps<typeof Viewport>;
declare global{interface Window{mountFocusViewport:(props:Props)=>void;focusProps:Props;focusLabels:{x:number;y:number;px:number}[]}}
let script:string,css:string,props:Props;
test.beforeAll(async()=>{
  const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{Viewport}from'./src/workspace/Viewport';import'./src/workspace/workspace.css';const root=createRoot(document.getElementById('root'));window.mountFocusViewport=props=>root.render(<div className="screen-workspace"><Viewport {...props}/></div>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,outfile:'focus.js',platform:'browser',format:'iife',jsx:'automatic'});
  script=bundle.outputFiles.find(f=>f.path.endsWith('.js'))!.text;css=bundle.outputFiles.find(f=>f.path.endsWith('.css'))!.text;
  const fixture=JSON.parse(await readFile('tests/reference/flanges-gaskets/Flan1.json','utf8'));
  props={drawing:fixture.cases[0].expected.view.drawing,visible:true,revision:1,primaryCommandIndices:[...Array.from({length:108},(_,i)=>i),...Array.from({length:149},(_,i)=>i+144)]};
});
async function mount(page:Page,next=props){
  await page.addInitScript(()=>{
    const clear=CanvasRenderingContext2D.prototype.fillRect,text=CanvasRenderingContext2D.prototype.fillText;
    window.focusLabels=[];
    CanvasRenderingContext2D.prototype.fillRect=function(x,y,w,h){const m=this.getTransform();if(this.canvas.getAttribute('aria-label')==='Engineering drawing'&&m.e===0&&m.f===0&&x===0&&y===0)window.focusLabels=[];Reflect.apply(clear,this,[x,y,w,h]);};
    CanvasRenderingContext2D.prototype.fillText=function(value,x,y){if(this.canvas.getAttribute('aria-label')==='Engineering drawing'&&/\d/.test(value)){const m=this.getTransform();window.focusLabels.push({x:(x*m.a+y*m.c+m.e)/devicePixelRatio,y:(x*m.b+y*m.d+m.f)/devicePixelRatio,px:Number(this.font.match(/([\d.]+)px/)?.[1])*Math.hypot(m.a,m.b)/devicePixelRatio});}Reflect.apply(text,this,[value,x,y]);};
  });
  await page.route('**/__focus-fixture',r=>r.fulfill({contentType:'text/html',body:`<style>${css}</style><div id="root"></div><div style="height:800px"></div>`}));
  await page.goto('/__focus-fixture');await page.addScriptTag({content:script});
  await page.evaluate(p=>{window.focusProps=p;window.mountFocusViewport(p);},next);
  await expect(page.getByLabel('Engineering drawing',{exact:true})).toBeVisible();
}

for(const width of [1440,390])test(`verified main drawing is centered at ${width}px and reset retains all views`,async({page},info)=>{
  await page.setViewportSize({width,height:844});await mount(page);
  await expect(page.getByLabel('Drawing view',{exact:true})).toHaveText('Primary view');
  await expect.poll(()=>page.evaluate(()=>window.focusLabels.length)).toBeGreaterThan(5);
  const initial=await page.evaluate(()=>({labels:window.focusLabels,w:document.querySelector('canvas')!.getBoundingClientRect().width,page:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(initial.page).toBeLessThanOrEqual(initial.viewport);
  expect(Math.min(...initial.labels.map(l=>l.x))).toBeGreaterThan(0);
  expect(Math.max(...initial.labels.map(l=>l.x))).toBeLessThan(initial.w);
  if(width===1440)expect(Math.min(...initial.labels.map(l=>l.px))).toBeGreaterThanOrEqual(12);
  await page.getByRole('button',{name:'Read dimensions',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>Math.min(...window.focusLabels.map(l=>l.px)))).toBeGreaterThanOrEqual(11.9);
  const visible=await page.evaluate(()=>{const c=document.querySelector('canvas')!.getBoundingClientRect();return window.focusLabels.filter(l=>l.x>=0&&l.x<=c.width&&l.y>=0&&l.y<=c.height).length;});
  expect(visible).toBeGreaterThanOrEqual(5);
  await page.screenshot({path:info.outputPath(`detail-${width}.png`)});
  await page.getByRole('button',{name:'Reset view',exact:true}).click();
  await expect(page.getByLabel('Drawing view',{exact:true})).toHaveText('All views');
  await expect(page.getByLabel('Zoom',{exact:true})).toHaveText('100%');
  await expect.poll(()=>page.getByLabel('Pan engineering layout').evaluate(e=>e.scrollLeft+e.scrollTop)).toBe(0);
  await page.getByRole('button',{name:'Primary view',exact:true}).click();
  await expect(page.getByLabel('Drawing view',{exact:true})).toHaveText('Primary view');
});

test('missing metadata uses complete overview and invalid metadata never enables primary focus',async({page})=>{
  await mount(page,{...props,primaryCommandIndices:undefined});
  await expect(page.getByLabel('Drawing view',{exact:true})).toHaveText('All views');
  await expect(page.getByRole('button',{name:'Primary view',exact:true})).toBeDisabled();
  await page.evaluate(p=>window.mountFocusViewport(p),{...props,revision:2,primaryCommandIndices:[99999]});
  await expect(page.getByLabel('Drawing view',{exact:true})).toHaveText('All views');
  await expect(page.getByRole('button',{name:'Primary view',exact:true})).toBeDisabled();
});

test('reading dimensions from overview recenters a far off-center primary group',async({page})=>{
  const drawing:Props['drawing']={width:100,height:100,transform:[1,0,0,1,0,0],commands:[
    {op:'line',from:{x:0,y:0},to:{x:100,y:100},color:'navy',width:1},
    {op:'text',text:'25',x:50,y:40,font:'20px serif',align:'center',color:'navy'},
    {op:'line',from:{x:5000,y:0},to:{x:5100,y:100},color:'navy',width:1},
  ]};
  await mount(page,{drawing,visible:true,revision:3,primaryCommandIndices:[0,1]});
  await page.getByRole('button',{name:'Reset view',exact:true}).click();
  await expect(page.getByLabel('Drawing view',{exact:true})).toHaveText('All views');
  await page.getByRole('button',{name:'Read dimensions',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>Math.abs(window.focusLabels[0].x-document.querySelector('canvas')!.getBoundingClientRect().width/2))).toBeLessThan(3);
  await expect(page.getByLabel('Drawing view',{exact:true})).toHaveText('Primary view');
});

test('resize and repeated detail focus stay useful without undoing user pan on redraw',async({page})=>{
  await page.setViewportSize({width:390,height:844});await mount(page);
  const pan=page.getByLabel('Pan engineering layout',{exact:true});
  await page.getByRole('button',{name:'Read dimensions',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Readable dimensions need more space'})).toBeVisible();
  await pan.evaluate(e=>{e.scrollLeft=35;e.scrollTop=40;});
  await expect.poll(()=>pan.evaluate(e=>e.scrollLeft)).toBe(35);
  await page.evaluate(()=>document.fonts.dispatchEvent(new Event('loadingdone')));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  expect(await pan.evaluate(e=>e.scrollLeft)).toBe(35);
  await page.setViewportSize({width:844,height:390});
  await expect(page.getByLabel('Drawing view',{exact:true})).toHaveText('Primary view');
  // The active reading mode must retain readability after rotation on its own.
  await expect.poll(()=>page.evaluate(()=>Math.min(...window.focusLabels.map(l=>l.px)))).toBeGreaterThanOrEqual(11.9);
  const zoomIn=page.getByRole('button',{name:'Zoom in',exact:true});
  while(await zoomIn.isEnabled())await zoomIn.click();
  await expect(page.getByLabel('Zoom',{exact:true})).toHaveText('1600%');
  const canvas=page.getByLabel('Engineering drawing',{exact:true});
  const raster=await canvas.evaluate(c=>({width:(c as HTMLCanvasElement).width,height:(c as HTMLCanvasElement).height}));
  expect(raster.width*raster.height).toBeLessThanOrEqual(16_000_000);
  await pan.focus();await page.keyboard.press('Home');
  await expect(page.getByLabel('Drawing view',{exact:true})).toHaveText('All views');
});

test('late mismatched asset uses overview and a new revision invalidates old focus',async({page})=>{
  let release!:()=>void,requested!:()=>void;
  const held=new Promise<void>(r=>{release=r;}),received=new Promise<void>(r=>{requested=r;});
  const changed=structuredClone(props.drawing);const line=changed.commands.find(c=>c.op==='line');
  if(line?.op==='line')line.from.x+=100;
  await page.route('**/api/workspaces/focus-asset/assets/drawing',async r=>{requested();await held;await r.fulfill({json:changed,headers:{'X-Workspace-Revision':'1'}}).catch(()=>{});});
  const asset={id:'focus-asset',revision:1,binding:{tabId:'tab',bindingRevision:1,recoveryGeneration:'generation'}};
  await mount(page,{...props,asset});await received;
  await expect(page.getByLabel('Drawing view',{exact:true})).toHaveText('Primary view');
  release();
  await expect(page.getByLabel('Engineering drawing',{exact:true})).toHaveAttribute('data-drawing-source','asset');
  await expect(page.getByLabel('Drawing view',{exact:true})).toHaveText('All views');
  await expect(page.getByLabel('Zoom',{exact:true})).toHaveText('100%');
  await expect(page.getByRole('button',{name:'Primary view',exact:true})).toBeDisabled();
  await page.evaluate(p=>window.mountFocusViewport(p),{...props,revision:2,asset:undefined});
  await expect(page.getByLabel('Drawing view',{exact:true})).toHaveText('Primary view');
});

test('mouse drag keyboard pan and two-finger pinch remain usable in primary focus',async({browser,baseURL})=>{
  const context=await browser.newContext({baseURL,viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try{
    const page=await context.newPage();await mount(page);
    const pan=page.getByLabel('Pan engineering layout',{exact:true});
    await page.getByRole('button',{name:'Zoom in',exact:true}).click();
    const before=await pan.evaluate(e=>e.scrollLeft),box=(await pan.boundingBox())!;
    await page.mouse.move(box.x+210,box.y+170);await page.mouse.down();
    await page.mouse.move(box.x+185,box.y+145,{steps:5});await page.mouse.up();
    await expect.poll(()=>pan.evaluate(e=>e.scrollLeft)).toBeGreaterThan(before);
    const dragged=await pan.evaluate(e=>e.scrollLeft);await pan.focus();await page.keyboard.press('ArrowRight');
    await expect.poll(()=>pan.evaluate(e=>e.scrollLeft)).toBeGreaterThan(dragged);
    await page.getByRole('button',{name:'Primary view',exact:true}).click();
    const target=(await pan.boundingBox())!,y=target.y+180;
    const cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:100,y},{id:2,x:220,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:80,y},{id:2,x:240,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect(page.getByLabel('Zoom',{exact:true})).not.toHaveText('100%');
    await cdp.detach();
  }finally{await context.close();}
});
