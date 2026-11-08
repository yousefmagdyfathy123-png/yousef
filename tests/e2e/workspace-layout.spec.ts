import {expect,test} from './ui-fixture';
import type {Page} from '@playwright/test';

async function visibleControlLabels(page:Page) {
  const controls=page.locator('.engineering-toolbar select:visible, .engineering-control button:visible');
  expect(await controls.count()).toBeGreaterThan(1);
  for(const control of await controls.all()) {
    const id=await control.getAttribute('id');
    expect(id).toBeTruthy();
    const label=page.locator(`label[data-control-label="${id}"]`);
    await expect(label).toBeVisible();
    await expect(label).toHaveAttribute('for',id!);
    expect(await control.evaluate(el=>(el as HTMLSelectElement|HTMLButtonElement).labels?.length)).toBe(1);
    expect((await label.textContent())!.trim().length).toBeGreaterThan(0);
  }
}

for(const width of [1440,390]) test(`active engineering inputs have associated visible labels at ${width}px`,async({page,openWorkspace},info)=>{
  await page.setViewportSize({width,height:844});await openWorkspace();
  await visibleControlLabels(page);
  for(const text of ['Component','Size','ASME Class','Face Type','Schedule'])await expect(page.locator('.engineering-control-label').filter({hasText:new RegExp('^'+text+'$')})).toBeVisible();
  const size=page.getByLabel('Size',{exact:true}),revision=await page.locator('.legacy-workspace').getAttribute('data-revision');
  await expect(size).toHaveValue('16');await expect(page.getByLabel('ASME Class',{exact:true})).toHaveValue('300#');
  await page.locator('label.engineering-control-label').filter({hasText:/^Size$/}).click();
  await expect(size).toBeFocused();
  await page.setViewportSize({width:width===390?844:1024,height:844});
  await expect(size).toBeFocused();await expect(size).toHaveValue('16');
  await expect(page.locator('.legacy-workspace')).toHaveAttribute('data-revision',revision!);
  await page.setViewportSize({width,height:844});
  await page.getByRole('region',{name:'Engineering workspace',exact:true}).screenshot({path:info.outputPath(`task5-flange-${width}.png`)});
  await page.getByRole('button',{name:'Reset view',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.getByLabel('Drawing view',{exact:true})).toHaveText('All views');
  await page.getByRole('button',{name:'Primary view',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.getByLabel('Drawing view',{exact:true})).toHaveText('Primary view');
  await page.getByText('Menu',{exact:true}).click();await page.getByText('Pipe Flexibility',{exact:true}).click();
  await page.getByRole('button',{name:'Distance to First Guide',exact:true}).click();
  await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Fxly1');await visibleControlLabels(page);
  for(const text of ['Material','Ambient Temperature','Design Temperature','Length to anchor'])await expect(page.locator('.engineering-control-label').filter({hasText:new RegExp('^'+text+'$')})).toBeVisible();
  await page.getByRole('button',{name:/^Length:/}).click();await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:/^Length:/})).toBeFocused();
  await expect(page.getByLabel('Component',{exact:true})).toBeHidden();
  await expect(page.locator('.engineering-control-label').filter({hasText:/^Component$/})).toBeHidden();
  await page.getByText('Menu',{exact:true}).click();await page.getByText('Pipe Flexibility',{exact:true}).click();
  await page.getByRole('button',{name:'Pipe Loop',exact:true}).click();
  await expect(page.locator('.engineering-control-label').filter({hasText:/^Length between anchors$/})).toBeVisible();
  await visibleControlLabels(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`task5-labels-${width}.png`),fullPage:true});
  await page.getByRole('button',{name:'Find',exact:true}).click();await page.getByRole('textbox',{name:'Find',exact:true}).fill('BLIND');
  await page.getByRole('dialog').getByRole('button',{name:'Find',exact:true}).click();
  await page.getByRole('button',{name:'Blind Flange Flanges · EN 1092-1:2018',exact:true}).click();
  await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Fldi2');await visibleControlLabels(page);
  await expect(page.getByLabel('Pressure rating (PN)',{exact:true})).toBeVisible();
  await expect(page.locator('.engineering-control-label').filter({hasText:/^Schedule$/})).toHaveCount(0);
  await expect(page.locator('.engineering-control-label').filter({hasText:/^Face Type$/})).toHaveCount(0);
});
type Bounds={left:number;right:number;top:number;bottom:number};
declare global {interface Window {drawingCommandBounds:Bounds|null}}

async function observeCommands(page:Page){
  await page.addInitScript(()=>{
    function include(ctx:CanvasRenderingContext2D,left:number,top:number,right:number,bottom:number){
      if(ctx.canvas.getAttribute('aria-label')!=='Engineering drawing')return;
      const m=ctx.getTransform(),corners=[m.transformPoint({x:left,y:top}),m.transformPoint({x:right,y:top}),m.transformPoint({x:left,y:bottom}),m.transformPoint({x:right,y:bottom})];
      const box={left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))};
      const previous=window.drawingCommandBounds;
      window.drawingCommandBounds=previous?{left:Math.min(previous.left,box.left),right:Math.max(previous.right,box.right),top:Math.min(previous.top,box.top),bottom:Math.max(previous.bottom,box.bottom)}:box;
    }
    const fill=CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect=function(x,y,width,height){
      if(this.canvas.getAttribute('aria-label')==='Engineering drawing'){
        const matrix=this.getTransform(),a=matrix.transformPoint({x,y}),b=matrix.transformPoint({x:x+width,y:y+height});
        const box={left:Math.min(a.x,b.x),right:Math.max(a.x,b.x),top:Math.min(a.y,b.y),bottom:Math.max(a.y,b.y)};
        if(box.left<=0&&box.top<=0&&box.right>=this.canvas.width-.5&&box.bottom>=this.canvas.height-.5)window.drawingCommandBounds=null;
        else include(this,x,y,x+width,y+height);
      }
      Reflect.apply(fill,this,[x,y,width,height]);
    };
    const text=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(value,x,y){
      const m=this.measureText(value),advance=x-(this.textAlign==='right'?m.width:this.textAlign==='center'?m.width/2:0);
      include(this,Math.min(x-m.actualBoundingBoxLeft,advance),y-m.actualBoundingBoxAscent,Math.max(x+m.actualBoundingBoxRight,advance+m.width),y+m.actualBoundingBoxDescent);
      Reflect.apply(text,this,[value,x,y]);
    };
    const paths=new WeakMap<CanvasRenderingContext2D,{x:number;y:number}[]>();
    const begin=CanvasRenderingContext2D.prototype.beginPath,move=CanvasRenderingContext2D.prototype.moveTo,line=CanvasRenderingContext2D.prototype.lineTo,stroke=CanvasRenderingContext2D.prototype.stroke;
    CanvasRenderingContext2D.prototype.beginPath=function(){paths.set(this,[]);Reflect.apply(begin,this,[]);};
    CanvasRenderingContext2D.prototype.moveTo=function(x,y){paths.get(this)?.push({x,y});Reflect.apply(move,this,[x,y]);};
    CanvasRenderingContext2D.prototype.lineTo=function(x,y){paths.get(this)?.push({x,y});Reflect.apply(line,this,[x,y]);};
    CanvasRenderingContext2D.prototype.stroke=function(){
      const points=paths.get(this);if(points?.length){const radius=this.lineWidth/2;include(this,Math.min(...points.map(p=>p.x))-radius,Math.min(...points.map(p=>p.y))-radius,Math.max(...points.map(p=>p.x))+radius,Math.max(...points.map(p=>p.y))+radius);}
      Reflect.apply(stroke,this,[]);
    };
  });
}

async function inkBounds(page:Page){
  return page.getByLabel('Engineering drawing',{exact:true}).evaluate(element=>{
    const c=element as HTMLCanvasElement,data=c.getContext('2d')!.getImageData(0,0,c.width,c.height).data;
    let left=c.width,right=-1,top=c.height,bottom=-1;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
      const i=(y*c.width+x)*4;
      // Source fractional-width strokes can antialias very pale when fitted.
      // Include every non-white pixel rather than measuring only dark labels.
      if(data[i+3]&&Math.min(data[i],data[i+1],data[i+2])<255){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    }
    return {left,right,top,bottom,width:c.width,height:c.height,dpr:devicePixelRatio,commands:window.drawingCommandBounds};
  });
}

test('controls stay outside the fitted drawing and resize preserves engineering identity',async({page,openWorkspace},info)=>{
  await observeCommands(page);await openWorkspace();
  // This assertion measures every source command, so select the complete overview.
  // Verified primary focus is covered separately by workspace-focus.spec.ts.
  await page.getByRole('button',{name:'Reset view',exact:true}).click();
  await expect(page.getByLabel('Drawing view',{exact:true})).toHaveText('All views');
  const workspace=page.getByRole('region',{name:'Engineering workspace',exact:true});
  const revision=await workspace.getAttribute('data-revision');
  for(const [width,height] of [[390,844],[844,390],[1024,768],[1440,900]]){
    await page.setViewportSize({width,height});
    const pan=page.getByLabel('Pan engineering layout',{exact:true});
    await expect(pan.locator('select,button,input,[data-header]')).toHaveCount(0);
    await expect(page.locator('.engineering-toolbar').getByLabel('Component',{exact:true})).toHaveValue('Flan1');
    await expect(page.getByLabel('Size',{exact:true})).toHaveValue('16');
    await expect(page.getByLabel('ASME Class',{exact:true})).toHaveValue('300#');
    await expect(workspace).toHaveAttribute('data-revision',revision!);
    await expect.poll(async()=>page.getByLabel('Engineering drawing').evaluate(c=>Math.abs((c as HTMLCanvasElement).getBoundingClientRect().width-c.parentElement!.parentElement!.clientWidth))).toBeLessThan(2);
    const ink=await inkBounds(page);
    await workspace.screenshot({path:info.outputPath(`workspace-${width}.png`)});
    expect(ink.right).toBeGreaterThan(ink.left);
    expect(ink.left).toBeGreaterThanOrEqual(20*ink.dpr);expect(ink.right).toBeLessThan(ink.width-20*ink.dpr);
    expect(ink.top).toBeGreaterThanOrEqual(20*ink.dpr);expect(ink.bottom).toBeLessThan(ink.height-20*ink.dpr);
    // Observe replayed primitives independently of the fitting helper. Include
    // white masks and text advance boxes, which a pixel-only box cannot see.
    const complete=ink.commands!;
    expect(Math.abs((complete.left+complete.right)/2-ink.width/2)).toBeLessThan(12*ink.dpr);
    expect(Math.abs((complete.top+complete.bottom)/2-ink.height/2)).toBeLessThan(12*ink.dpr);
    const toolbar=await page.locator('.engineering-toolbar').boundingBox(),stage=await pan.boundingBox();
    expect(toolbar!.y+toolbar!.height).toBeLessThanOrEqual(stage!.y);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await workspace.screenshot({path:info.outputPath(`workspace-${width}.png`)});
  }
});

test('fit-relative zoom reaches every edge, survives resize and resets on committed selection',async({page,openWorkspace})=>{
  await page.setViewportSize({width:390,height:844});await openWorkspace();
  const pan=page.getByLabel('Pan engineering layout',{exact:true}),zoom=page.getByLabel('Zoom',{exact:true});
  const revision=await page.locator('.legacy-workspace').getAttribute('data-revision');
  await expect(zoom).toHaveText('100%');await expect(page.getByRole('button',{name:'Zoom out',exact:true})).toBeDisabled();
  for(let i=0;i<13;i++)if(await page.getByRole('button',{name:'Zoom in',exact:true}).isEnabled())await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  await expect(zoom).toHaveText('1600%');await expect(page.getByRole('button',{name:'Zoom in',exact:true})).toBeDisabled();
  await pan.evaluate(e=>e.scrollTo(0,0));await pan.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');
  await expect.poll(()=>pan.evaluate(e=>e.scrollLeft>0&&e.scrollTop>0)).toBe(true);
  await pan.evaluate(e=>e.scrollTo(e.scrollWidth,e.scrollHeight));
  expect(await pan.evaluate(e=>Math.abs(e.scrollLeft+e.clientWidth-e.scrollWidth)<2&&Math.abs(e.scrollTop+e.clientHeight-e.scrollHeight)<2)).toBe(true);
  await page.setViewportSize({width:844,height:390});await expect(zoom).toHaveText('1600%');
  await expect.poll(()=>pan.evaluate(e=>Math.abs(e.scrollLeft-(e.scrollWidth-e.clientWidth)/2)<2&&Math.abs(e.scrollTop-(e.scrollHeight-e.clientHeight)/2)<2)).toBe(true);
  await expect(page.locator('.legacy-workspace')).toHaveAttribute('data-revision',revision!);
  await page.getByRole('button',{name:'Reset view',exact:true}).click();await expect(zoom).toHaveText('100%');
  await expect.poll(()=>pan.evaluate(e=>e.scrollLeft===0&&e.scrollTop===0)).toBe(true);
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();await expect(zoom).toHaveText('125%');
  await page.getByLabel('ASME Class',{exact:true}).selectOption('600#');
  await expect(page.locator('[data-header="1"]')).toContainText('600#');await expect(zoom).toHaveText('100%');
});

test('unavailable selection removes prior engineering ink while preserving current parameters',async({page,openWorkspace})=>{
  await openWorkspace();expect((await inkBounds(page)).right).toBeGreaterThan(0);
  await page.getByLabel('ASME Class',{exact:true}).selectOption('150#');
  await page.getByLabel('Size',{exact:true}).selectOption('5');
  await page.getByLabel('Face Type',{exact:true}).selectOption('RTJ');
  await expect(page.getByLabel('Face Type',{exact:true})).toHaveValue('RTJ');
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect.poll(async()=>await page.getByLabel('Engineering drawing').count()?(await inkBounds(page)).right:-1).toBe(-1);
});

test('cancelled pinch releases both pointers before keyboard and mouse panning',async({page,openWorkspace,browserName})=>{
  test.skip(browserName!=='chromium','Trusted pinch cancellation uses Chromium CDP');
  await page.setViewportSize({width:390,height:844});await openWorkspace();
  const pan=page.getByLabel('Pan engineering layout',{exact:true}),zoom=page.getByLabel('Zoom',{exact:true});
  await pan.scrollIntoViewIfNeeded();const box=(await pan.boundingBox())!,x=box.x+60,y=box.y+100;
  const cdp=await page.context().newCDPSession(page);
  try{
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:21,x,y},{id:22,x:x+100,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:21,x,y},{id:22,x:x+150,y}]});
    await expect(zoom).toHaveText('150%');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  }finally{await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();}
  await pan.evaluate(e=>e.scrollTo(0,0));await pan.focus();await page.keyboard.press('ArrowRight');
  await expect.poll(()=>pan.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
  await pan.evaluate(e=>e.scrollTo(0,0));
  await page.mouse.move(box.x+box.width-40,y);await page.mouse.down();await page.mouse.move(box.x+40,y,{steps:4});await page.mouse.up();
  await expect.poll(()=>pan.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
  await expect(zoom).toHaveText('150%');await expect(page.getByLabel('Size',{exact:true})).toHaveValue('16');
});
