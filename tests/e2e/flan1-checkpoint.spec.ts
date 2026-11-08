import { expect,test } from '@playwright/test';
import { loadFlangeCases } from '../reference/flange-cases';
const refs={cases:loadFlangeCases('Flan1')};
test('real Flan1 server transition produces source-backed selection, headers and Canvas',async({page},testInfo)=>{
  const documentResponse = await page.goto('/');
  expect(documentResponse?.headers()['content-type']).toBe('text/html; charset=utf-8');await expect(page.getByLabel('Size',{exact:true})).toHaveValue('16');
  await expect(page.getByLabel('ASME Class',{exact:true})).toHaveValue('300#');await expect(page.getByLabel('Face Type',{exact:true})).toHaveValue('RF');
  await expect(page.getByText('6"NPS Weldneck Flange 300# RF Sch-STD',{exact:true})).toBeVisible();
  const response=page.waitForResponse(r=>r.url().endsWith('/action')&&r.request().method()==='POST');
  await page.getByLabel('Face Type',{exact:true}).selectOption('RTJ');const data=await (await response).json();
  expect(data.view.headers[0]).toBe('6"NPS Weldneck Flange 300# RTJ Sch-STD');expect(JSON.stringify(data)).not.toMatch(/sourceRefs|activeDba|lineMem|DataBaseName|audit\/|sourceHash/);
  const reference=refs.cases.find(c=>c.initial.Units==='Metric'&&c.initial.ASMEClass==='300#'&&c.initial.Face==='RTJ'&&c.initial.MainSize===16)!;
  expect(data.view.drawing.commands).toEqual(reference.expected.view.drawing.commands);
  await expect(page.getByText('6"NPS Weldneck Flange 300# RTJ Sch-STD',{exact:true})).toBeVisible();
  await page.getByLabel('Units',{exact:true}).selectOption('Imperial');
  await expect(page.locator('[data-header="2"]')).toContainText('lb');
  expect(await page.locator('canvas').evaluate((c:HTMLCanvasElement)=>({width:c.width,height:c.height,logical:[c.style.width,c.style.height]}))).toEqual({width:1067,height:690,logical:['1067px','690px']});
  await page.screenshot({path:testInfo.outputPath('flan1-desktop.png'),fullPage:true});
});
test('applicable unavailable parameters preserve source message and white drawing',async({page},testInfo)=>{
  await page.goto('/');await page.getByLabel('ASME Class',{exact:true}).selectOption('150#');await page.getByLabel('Size',{exact:true}).selectOption('5');await page.getByLabel('Face Type',{exact:true}).selectOption('RTJ');
  await expect(page.getByText('Not manufactured with the selected parameters',{exact:true})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('flan1-unavailable.png'),fullPage:true});
});
test('managed harness rejects direct actions and private file paths',async({request})=>{
  expect((await request.post('/action',{data:{type:'select-route',routeId:'Flan1'}})).status()).toBe(403);
  expect((await request.get('/Database/Flan/Flg300.csv')).status()).toBe(404);
});
test('DPR2 keeps logical geometry and doubles actual Canvas backing pixels',async({browser})=>{
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2});
  try{const page=await context.newPage();await page.goto('http://127.0.0.1:3186/');await expect(page.getByLabel('Size',{exact:true})).toHaveValue('16');
    await expect.poll(()=>page.locator('canvas').evaluate((c:HTMLCanvasElement)=>[c.width,c.height,c.style.width,c.style.height])).toEqual([2134,1380,'1067px','690px']);
  }finally{await context.close();}
});
