import { expect,test } from '@playwright/test';
test('all-route navigation, settings cancellation, search and public identity',async({page})=>{
  await page.goto('/');await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Flan1');
  await page.getByLabel('Component',{exact:true}).selectOption('Flan2');await expect(page.locator('[data-header="1"]')).toContainText('Slip-on');
  await page.getByRole('button',{name:'Last component',exact:true}).click();await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Flan7');
  await page.getByRole('button',{name:'Back',exact:true}).click();await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Flan2');
  await page.getByRole('button',{name:'Forward',exact:true}).click();await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Flan7');
  await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('General Units',{exact:true}).selectOption('Imperial');await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(page.getByLabel('Units',{exact:true})).toHaveValue('Metric');await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Find',exact:true}).click();await page.getByRole('textbox',{name:'Find',exact:true}).fill('flange');
  await page.getByRole('dialog').getByRole('button',{name:'Find',exact:true}).click();await expect(page.getByRole('list',{name:'Search results'}).getByRole('button').first()).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'About',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Results do not replace professional engineering review.');
  await expect(page.getByRole('dialog')).not.toContainText('Pipedata');await page.keyboard.press('Escape');
});
test('source menus open calculator and parameter documents without private markup',async({page})=>{
  await page.goto('/');await page.getByText('Menu',{exact:true}).click();await page.getByText('Pipe Flexibility',{exact:true}).click();
  await page.getByRole('button',{name:'Distance to First Guide',exact:true}).click();
  await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Fxly1');await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('button',{name:/^Ambient Temperature:/}).click();await expect(page.getByRole('dialog')).toContainText('Ambient Temperature');
  await page.getByRole('textbox',{name:'Value',exact:true}).fill('80');await page.getByRole('button',{name:'Apply',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:/^Length:/}).click();await page.getByRole('textbox',{name:'Value',exact:true}).fill('1');await page.getByRole('button',{name:'Apply',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('between 500 and 100000 mm');await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByText('Menu',{exact:true}).click();await page.getByText('Safe Spans',{exact:true}).click();await page.getByRole('button',{name:'Rack Spans',exact:true}).click();
  await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Span1');await page.getByRole('button',{name:'Rack Span parameters',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Rack Span Parameters');await expect(page.getByRole('dialog').locator('iframe,script,img,a')).toHaveCount(0);
  await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByText('Menu',{exact:true}).click();await page.getByRole('button',{name:'Welded Branches',exact:true}).click();
  await page.getByLabel('Component',{exact:true}).selectOption('Wbol10');await expect(page.getByLabel('ASME Class',{exact:true}).locator('option[value="400#"]')).toBeDisabled();
});
test('narrow layout scrolls, zooms and remains operable without reordering controls',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.getByLabel('Size',{exact:true})).toHaveValue('16');
  const before=await page.locator('.legacy-selector').evaluateAll(els=>els.map(e=>({id:e.getAttribute('aria-label'),left:(e as HTMLElement).style.left})));
  if(testInfo.project.use.hasTouch)await page.getByRole('button',{name:'Zoom in',exact:true}).tap();else await page.getByRole('button',{name:'Zoom in',exact:true}).click();await expect(page.getByLabel('Zoom',{exact:true})).toHaveText('125%');
  const scroll=page.getByLabel('Pan engineering layout',{exact:true});await scroll.focus();await page.keyboard.press('ArrowRight');
  expect(await scroll.evaluate(e=>e.scrollWidth>e.clientWidth&&e.scrollLeft>0)).toBe(true);
  await page.getByLabel('ASME Class',{exact:true}).selectOption('600#');await expect(page.locator('[data-header="1"]')).toContainText('600#');
  expect(await page.locator('.legacy-selector').evaluateAll(els=>els.map(e=>({id:e.getAttribute('aria-label'),left:(e as HTMLElement).style.left})))).toEqual(before);
  await page.screenshot({path:testInfo.outputPath('task11-phone.png'),fullPage:true});
  await page.setViewportSize({width:844,height:390});await expect(page.getByLabel('ASME Class',{exact:true})).toHaveValue('600#');
});
test('print snapshot has source width and notice, cancellation/failure restores live workspace',async({page},testInfo)=>{
  await page.goto('/');await expect(page.getByLabel('Size',{exact:true})).toHaveValue('16');
  const before=await page.locator('.legacy-workspace').getAttribute('data-revision');
  await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));await page.emulateMedia({media:'print'});
  await expect(page.getByLabel('Print snapshot')).toBeVisible();expect(await page.locator('.print-view canvas').evaluate((c:HTMLCanvasElement)=>({backing:c.width,expected:Math.round(650*window.devicePixelRatio),logical:c.style.width}))).toEqual(expect.objectContaining({logical:'650px'}));
  expect(await page.locator('.print-view canvas').evaluate((c:HTMLCanvasElement)=>c.width===Math.round(650*window.devicePixelRatio))).toBe(true);
  await expect(page.locator('.print-view [data-header="7"]')).toHaveCount(0);await expect(page.locator('.print-view footer')).toContainText('professional engineering review');
  await page.screenshot({path:testInfo.outputPath('task11-print.png'),fullPage:true});
  await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));await expect(page.getByLabel('Print snapshot')).toHaveCount(0);
  await page.evaluate(()=>{window.print=()=>{throw new Error('cancelled printer');};});await page.getByRole('button',{name:'Print',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Printing could not be completed');await expect(page.getByLabel('Size',{exact:true})).toBeEnabled();
  expect(await page.locator('.legacy-workspace').getAttribute('data-revision')).toBe(before);
  await page.evaluate(()=>{window.print=()=>{window.dispatchEvent(new Event('beforeprint'));};});await page.getByRole('button',{name:'Print',exact:true}).click();
  await expect(page.getByLabel('Print snapshot')).toHaveCount(1);await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));await expect(page.getByLabel('Print snapshot')).toHaveCount(0);
});
test('two touch pointers zoom and release cleanly; mouse drag pans the fixed layout',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.getByLabel('Size',{exact:true})).toHaveValue('16');
  const pan=page.getByLabel('Pan engineering layout',{exact:true});await pan.scrollIntoViewIfNeeded();const area=(await pan.boundingBox())!;const y=area.y+100,x=area.x+70;
  if(browserName==='chromium'){
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:11,x,y},{id:12,x:x+100,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:11,x,y},{id:12,x:x+150,y}]});
    await expect(page.getByLabel('Zoom',{exact:true})).toHaveText('150%');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
  }
  await page.getByRole('button',{name:'Reset view',exact:true}).click();
  for(let i=0;i<4;i++)await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  const scroll=page.getByLabel('Pan engineering layout',{exact:true});await scroll.evaluate(e=>{e.scrollLeft=0;});
  const box=(await scroll.boundingBox())!;await page.mouse.move(box.x+300,box.y+250);await page.mouse.down();await page.mouse.move(box.x+120,box.y+250,{steps:5});await page.mouse.up();
  expect(await scroll.evaluate(e=>e.scrollLeft)).toBeGreaterThan(100);await page.getByLabel('ASME Class',{exact:true}).selectOption('900#');await expect(page.locator('[data-header="1"]')).toContainText('900#');
});
test('wide component toolbar keeps source selections above the drawing',async({page},testInfo)=>{
  await page.goto('/');await page.getByText('Menu',{exact:true}).click();await page.getByText('Gaskets',{exact:true}).click();
  await page.getByRole('button',{name:'Nonmetallic Flat Gaskets',exact:true}).click();await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Gflt1');
  await expect(page.locator('.engineering-toolbar').getByLabel('Component',{exact:true})).toHaveValue('Gflt1');
  await expect(page.getByLabel('Pan engineering layout').getByLabel('Size',{exact:true})).toHaveCount(0);
  const size=page.getByLabel('Size',{exact:true}),value=await size.locator('option').nth(1).getAttribute('value');await size.selectOption(value!);await expect(size).toHaveValue(value!);
  await page.screenshot({path:testInfo.outputPath('task11-wide.png'),fullPage:true});
});
