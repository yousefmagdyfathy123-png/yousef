import {test,expect} from './ui-fixture';
import type {Page} from '@playwright/test';

async function openTouchWorkspace(page:Page,baseURL:string|undefined){
  if(baseURL?.startsWith('https:')){
    await page.goto('/workspace');await page.getByRole('button',{name:'Open new workspace',exact:true}).click();
  }else await page.goto('/');
  await expect(page.getByLabel('Engineering drawing',{exact:true})).toBeVisible();
}

test('wheel over a fitted drawing scrolls the page and chains at zoom boundaries',async({page,openWorkspace})=>{
  await openWorkspace();
  const pan=page.getByLabel('Pan engineering layout',{exact:true});
  await expect(page.getByLabel('Engineering drawing',{exact:true})).toBeVisible();
  const box=(await pan.boundingBox())!;
  await page.mouse.move(box.x+100,box.y+100);await page.mouse.wheel(0,300);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(0);
  await page.evaluate(()=>scrollTo(0,0));
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  await pan.evaluate(e=>e.scrollTop=e.scrollHeight);
  const zoomed=(await pan.boundingBox())!;
  await page.mouse.move(zoomed.x+100,zoomed.y+100);await page.mouse.wheel(0,300);
  // Chromium consumes the first wheel update while finishing a fractional
  // scroll position; the next update chains naturally to the document.
  await page.waitForTimeout(100);await page.mouse.wheel(0,300);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(0);
});

test('one finger scrolls the page over the fitted drawing',async({browser,baseURL,storageState,ignoreHTTPSErrors})=>{
  const context=await browser.newContext({baseURL,storageState,ignoreHTTPSErrors,viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try{
    const page=await context.newPage();await openTouchWorkspace(page,baseURL);
    const cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:200,y:650}]});
    for(let y=610;y>=290;y-=40){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:200,y}]});await page.waitForTimeout(25);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(0);
  }finally{await context.close();}
});

test('one finger pans a zoomed drawing and returns to page scrolling at its edge',async({browser,baseURL,storageState,ignoreHTTPSErrors})=>{
  const context=await browser.newContext({baseURL,storageState,ignoreHTTPSErrors,viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try{
    const page=await context.newPage();await openTouchWorkspace(page,baseURL);
    await page.getByRole('button',{name:'Zoom in',exact:true}).click();
    const pan=page.getByLabel('Pan engineering layout',{exact:true});
    await pan.evaluate(e=>e.scrollTop=0);
    const cdp=await context.newCDPSession(page);
    async function swipe(){
      // Labels can place the canvas below the fold. Start the trusted gesture
      // on the real visible viewport, not on the preceding hint or toolbar.
      await pan.scrollIntoViewIfNeeded();
      const box=(await pan.boundingBox())!,start=Math.min(780,box.y+box.height-40);
      expect(await page.evaluate(({x,y})=>!!document.elementFromPoint(x,y)?.closest('.workspace-scroll'),{x:200,y:start})).toBe(true);
      const documentBefore=await page.evaluate(()=>scrollY);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:200,y:start}]});
      for(let y=start-30;y>=start-150;y-=30){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:200,y}]});await page.waitForTimeout(25);}
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      return documentBefore;
    }
    await swipe();await expect.poll(()=>pan.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
    await page.evaluate(()=>scrollTo(0,0));await pan.evaluate(e=>e.scrollTop=e.scrollHeight);
    const documentBefore=await swipe();await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(documentBefore);
  }finally{await context.close();}
});

test('readable dimensions keep viewport resolution and reset to the complete overview',async({page,openWorkspace})=>{
  await page.setViewportSize({width:390,height:844});
  // Observe painted labels independently of the layout helper.
  await page.addInitScript(()=>{
    const original=CanvasRenderingContext2D.prototype.fillText;
    (window as unknown as {labelSizes:number[]}).labelSizes=[];
    CanvasRenderingContext2D.prototype.fillText=function(text,x,y){
      if(this.canvas.getAttribute('aria-label')==='Engineering drawing'){
        const m=this.getTransform();
        const px=Number(this.font.match(/([\d.]+)px/)?.[1]);
        (window as unknown as {labelSizes:number[]}).labelSizes.push(px*Math.hypot(m.a,m.b)/devicePixelRatio);
      }
      Reflect.apply(original,this,[text,x,y]);
    };
  });
  await openWorkspace();await page.waitForSelector('canvas');
  await page.evaluate(()=>{(window as unknown as {labelSizes:number[]}).labelSizes=[];});
  await page.getByRole('button',{name:'Read dimensions',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>Math.max(...(window as unknown as {labelSizes:number[]}).labelSizes))).toBeGreaterThanOrEqual(11.9);
  const pan=page.getByLabel('Pan engineering layout',{exact:true});
  const canvas=page.getByLabel('Engineering drawing',{exact:true});
  expect(await canvas.evaluate(e=>(e as HTMLCanvasElement).width)).toBeLessThan(1000);
  await expect.poll(()=>pan.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Reset view',exact:true}).click();
  await expect(page.getByLabel('Zoom',{exact:true})).toHaveText('100%');
  await expect.poll(()=>pan.evaluate(e=>e.scrollLeft+e.scrollTop)).toBe(0);
});

test('outside click and keyboard focus close menus while nested actions remain usable',async({page,openWorkspace})=>{
  await openWorkspace();
  const summary=page.getByText('Menu',{exact:true}),root=page.locator('.legacy-menu > details').first();
  await summary.click();await page.getByText('Flanges',{exact:true}).click();
  await expect(root).toHaveAttribute('open','');
  await page.locator('.engineering-headers').click();
  await expect(page.locator('.legacy-menu details[open]')).toHaveCount(0);
  await summary.click();await page.getByLabel('Units',{exact:true}).focus();
  await expect(root).not.toHaveAttribute('open','');
  await summary.click();await page.getByText('Flanges',{exact:true}).click();
  await page.getByRole('button',{name:'ASME B16.5 Flanges',exact:true}).click();
  await expect(page.locator('.legacy-menu details[open]')).toHaveCount(0);
  await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Flan1');
});
