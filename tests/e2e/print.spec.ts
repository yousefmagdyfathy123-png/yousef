import { expect, test } from './ui-fixture';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { Page } from '@playwright/test';

async function capturePrint(page:Page,options:Parameters<Page['pdf']>[0]){
  // Playwright's PDF API is Chromium-only. Other engines still exercise the
  // complete print composition; their screenshots are not PDF verification.
  if(page.context().browser()?.browserType().name()==='chromium'){
    const pdf=await page.pdf(options);
    // Chromium writes page dictionaries outside the compressed image streams.
    // Inspect the actual PDF, not just the measured HTML sheet.
    expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
  }
  else await page.screenshot({path:options?.path?.replace(/\.pdf$/,'.png'),fullPage:true});
}

async function nativePrint(page:import('@playwright/test').Page){
  await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
  await page.emulateMedia({media:'print'});
  await expect(page.getByLabel('Print snapshot')).toBeVisible();
}
async function finishPrint(page:import('@playwright/test').Page){
  await page.emulateMedia({media:'screen'});
  await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
  await expect(page.getByLabel('Print snapshot')).toHaveCount(0);
}
test('print excludes host application content outside an embedded workspace',async({page,openWorkspace})=>{
  await openWorkspace();
  await page.evaluate(()=>{
    const host=document.createElement('header');host.id='outer-application-header';
    host.innerHTML='<h1>Host application title</h1><p>Account and trial status</p>';
    document.body.prepend(host);
  });
  await nativePrint(page);
  await expect(page.locator('#outer-application-header')).not.toBeVisible();
  await expect(page.getByLabel('Print snapshot')).toBeVisible();
  await finishPrint(page);
  await expect(page.locator('#outer-application-header')).toBeVisible();
});
test('A4 landscape print fits a captured drawing and selected parameters without application furniture',async({page,openWorkspace},info)=>{
  await openWorkspace();const before=await page.locator('.legacy-workspace').getAttribute('data-revision');
  await nativePrint(page);
  const print=page.getByLabel('Print snapshot');await expect(print).toHaveAttribute('data-print-revision',before!);
  await expect(print.locator('h1')).toContainText('Weldneck Flange');
  await expect(print.locator('dl')).toContainText('ASME Class');await expect(print.locator('dl')).toContainText('300#');
  await expect(print.locator('select,button,table,footer,nav')).toHaveCount(0);
  await expect(page.locator('.engineering-toolbar')).not.toBeVisible();
  await expect(print.locator('.engineering-control-label,label')).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Alfadata',exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Workspace settings',{exact:true})).not.toBeVisible();
  const size=await print.evaluate(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,scroll:el.scrollHeight}));
  expect(size.w).toBeCloseTo(273*96/25.4,0);expect(size.h).toBeCloseTo(186*96/25.4,0);expect(size.scroll).toBeLessThanOrEqual(Math.ceil(size.h));
  const canvas=print.locator('canvas');await expect.poll(()=>canvas.evaluate((el:HTMLCanvasElement)=>el.width)).toBeGreaterThan(900);
  await capturePrint(page,{path:info.outputPath('flan1-metric-a4.pdf'),preferCSSPageSize:true,printBackground:true});
  await page.screenshot({path:info.outputPath('flan1-print.png'),fullPage:true});
  await finishPrint(page);await page.getByLabel('Size',{exact:true}).selectOption('20');
  await expect(page.getByLabel('Size',{exact:true})).toHaveValue('20');
});

test('native print during pending work retains one revision through repeated beforeprint and later commits',async({page,openWorkspace})=>{
  await openWorkspace();const before=await page.locator('.legacy-workspace').getAttribute('data-revision');
  let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
  await page.route(/\/action(s)?$/,async route=>{const response=await route.fetch();await held;await route.fulfill({response});});
  await page.getByLabel('Size',{exact:true}).selectOption('20');
  await expect(page.getByLabel('Units',{exact:true})).toBeDisabled();await nativePrint(page);
  const title=await page.locator('.print-view h1').textContent();release();
  await expect(page.locator('.legacy-workspace')).toHaveAttribute('data-revision',String(Number(before)+1));
  await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
  await expect(page.getByLabel('Print snapshot')).toHaveAttribute('data-print-revision',before!);
  await expect(page.locator('.print-view h1')).toHaveText(title!);
  await finishPrint(page);await expect(page.getByLabel('Size',{exact:true})).toBeEnabled();
});

test('programmatic printing waits for actual fonts, locks actions and cancellation prevents a late print',async({page,openWorkspace})=>{
  await openWorkspace();const require=createRequire(import.meta.url);
  const font=await readFile(require.resolve('next/dist/next-devtools/server/font/geist-mono-latin.woff2'));
  let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/print-font.woff2',async route=>{await held;await route.fulfill({body:font,contentType:'font/woff2'});});
  await page.addStyleTag({content:"@font-face{font-family:PrintDelayed;src:url('/print-font.woff2')}.print-view{font-family:PrintDelayed,serif!important}"});
  await page.evaluate(()=>{(window as any).printCalls=0;window.print=()=>{(window as any).printCalls++;window.dispatchEvent(new Event('beforeprint'));};});
  await page.getByRole('button',{name:'Print',exact:true}).click();
  await expect(page.getByLabel('Print snapshot')).toHaveCount(1);await expect(page.getByLabel('Size',{exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>(window as any).printCalls)).toBe(0);
  await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));release();
  await expect(page.getByLabel('Size',{exact:true})).toBeEnabled();
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);});
  expect(await page.evaluate(()=>(window as any).printCalls)).toBe(0);
  await page.getByRole('button',{name:'Print',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).printCalls)).toBe(1);
  await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
  await expect(page.getByRole('button',{name:'Print',exact:true})).toBeFocused();
});

test('print failure and cancellation restore actions, focus and allow a subsequent selection',async({page,openWorkspace})=>{
  await openWorkspace();await page.evaluate(()=>{window.print=()=>{throw new Error('printer failed');};});
  await page.getByRole('button',{name:'Print',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'Printing could not be completed'})).toBeVisible();
  await expect(page.getByLabel('Print snapshot')).toHaveCount(0);await expect(page.getByLabel('Size',{exact:true})).toBeEnabled();
  await expect(page.getByRole('button',{name:'Print',exact:true})).toBeFocused();
  await page.evaluate(()=>{window.print=()=>{window.dispatchEvent(new Event('beforeprint'));};});
  await page.getByRole('button',{name:'Print',exact:true}).click();await expect(page.getByLabel('Size',{exact:true})).toBeDisabled();
  await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));await page.getByLabel('Size',{exact:true}).selectOption('20');
  await expect(page.getByLabel('Size',{exact:true})).toHaveValue('20');
});

// Exercise the real print component with exact source commands and explicit
// display-only fixture variants; no golden engineering values are regenerated.
test('long headers remeasure the remaining print area and hidden/unavailable snapshots have no stale canvas',async({page},info)=>{
  const {build}=await import('esbuild');
  const {loadFlangeCases}=await import('../reference/flange-cases');
  const {resolve}=await import('node:path');
  const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {PrintView} from './src/workspace/PrintView';const root=createRoot(document.getElementById('root'));window.renderPrint=snapshot=>root.render(<PrintView snapshot={snapshot}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'browser',format:'iife',write:false,jsx:'automatic'});
  const css=await readFile(resolve('src/workspace/workspace.css'),'utf8');
  await page.route('**/__print-fixture',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('/__print-fixture');await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text});
  const snapshot={workspaceId:'print-fixture',revision:37,view:structuredClone(loadFlangeCases('Flan1')[0].expected.view)};
  snapshot.view.headers[0]='Complete engineering component Ø 1½ / 45° — '.repeat(7);
  snapshot.view.controls[0].text='Selected engineering parameter with a long exact label '.repeat(5);
  await page.evaluate(s=>(window as any).renderPrint(s),snapshot);await page.emulateMedia({media:'print'});
  await expect(page.locator('.print-identity h1')).toHaveText(snapshot.view.headers[0]);
  await expect(page.locator('.print-identity dd').first()).toHaveText(snapshot.view.controls[0].text);
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);});
  await expect.poll(()=>page.locator('.print-drawing canvas').evaluate((el:HTMLCanvasElement)=>Math.abs(el.getBoundingClientRect().height-el.parentElement!.getBoundingClientRect().height))).toBeLessThan(1);
  expect(await page.locator('.print-view').evaluate(el=>el.scrollHeight<=Math.ceil(el.getBoundingClientRect().height))).toBe(true);
  await capturePrint(page,{path:info.outputPath('long-headers-a4.pdf'),preferCSSPageSize:true,printBackground:true});
  snapshot.revision++;snapshot.view.visibility.drawing=false;
  await page.evaluate(s=>(window as any).renderPrint(s),snapshot);await expect(page.locator('.print-view canvas')).toHaveCount(0);
  snapshot.revision++;snapshot.view.visibility.drawing=true;snapshot.view.textResults={status:'unavailable',rows:[]};snapshot.view.messages=['Selection unavailable'];
  await page.evaluate(s=>(window as any).renderPrint(s),snapshot);await expect(page.locator('.print-view canvas')).toHaveCount(0);
  await expect(page.locator('.print-message')).toHaveText('Selection unavailable');
  await capturePrint(page,{path:info.outputPath('unavailable-a4.pdf'),preferCSSPageSize:true,printBackground:true});
});

test('Imperial selections and drawing stay together in A4 print output',async({page,openWorkspace},info)=>{
  await openWorkspace();await page.getByLabel('Units',{exact:true}).selectOption('Imperial');
  await expect(page.getByLabel('Units',{exact:true})).toBeEnabled();
  const revision=await page.locator('.legacy-workspace').getAttribute('data-revision');await nativePrint(page);
  await expect(page.getByLabel('Print snapshot')).toHaveAttribute('data-print-revision',revision!);
  await expect(page.locator('.print-identity dl')).toContainText('Imperial');
  await capturePrint(page,{path:info.outputPath('flan1-imperial-a4.pdf'),preferCSSPageSize:true,printBackground:true});
  await finishPrint(page);
});

test('native print taking over a font wait does not open a second dialog when fonts finish',async({page,openWorkspace})=>{
  await openWorkspace();const require=createRequire(import.meta.url);
  const font=await readFile(require.resolve('next/dist/next-devtools/server/font/geist-mono-latin.woff2'));
  let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/takeover-font.woff2',async route=>{await held;await route.fulfill({body:font,contentType:'font/woff2'});});
  await page.addStyleTag({content:"@font-face{font-family:TakeoverFont;src:url('/takeover-font.woff2')}.print-view{font-family:TakeoverFont,serif!important}"});
  await page.evaluate(()=>{(window as any).printCalls=0;window.print=()=>{(window as any).printCalls++;};});
  await page.getByRole('button',{name:'Print',exact:true}).click();await expect(page.getByLabel('Print snapshot')).toHaveCount(1);
  await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));release();
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));});
  expect(await page.evaluate(()=>(window as any).printCalls)).toBe(0);
  await expect(page.getByLabel('Print snapshot')).toHaveCount(1);await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
  await expect(page.getByLabel('Size',{exact:true})).toBeEnabled();
});

for(const route of ['Flan1','Gflt1','Span1'] as const)test(`${route} normal workspace selections match captured PDF identity`,async({page,openWorkspace},info)=>{
  await page.setViewportSize({width:1440,height:900});
  await openWorkspace();
  if(route==='Gflt1'){
    await page.getByText('Menu',{exact:true}).click();await page.getByText('Gaskets',{exact:true}).click();
    await page.getByRole('button',{name:'Nonmetallic Flat Gaskets',exact:true}).click();
  }else if(route==='Span1'){
    await page.getByText('Menu',{exact:true}).click();await page.getByText('Safe Spans',{exact:true}).click();
    await page.getByRole('button',{name:'Rack Spans',exact:true}).click();
  }
  await expect(page.getByLabel('Component',{exact:true})).toHaveValue(route);
  const size=page.getByLabel('Size',{exact:true});
  if(await size.count()){
    const options=await size.locator('option:not([disabled])').evaluateAll(items=>items.map(item=>(item as HTMLOptionElement).value));
    if(options.length)await size.selectOption(options[options.length-1]);
    await expect(size).toBeEnabled();
  }
  const revision=await page.locator('.legacy-workspace').getAttribute('data-revision');
  const title=await page.locator('[data-header="1"]').textContent();
  const selections=await page.locator('.engineering-toolbar select:visible').evaluateAll(selects=>selects.map(el=>{
    const select=el as HTMLSelectElement;return {label:select.getAttribute('aria-label'),value:select.value,text:select.selectedOptions[0]?.text};
  }));
  await page.screenshot({path:info.outputPath(`${route}-screen.png`),fullPage:true});
  await nativePrint(page);
  const sheet=page.getByLabel('Print snapshot');
  await expect(sheet).toHaveAttribute('data-print-revision',revision!);
  if(title)await expect(sheet.locator('h1')).toHaveText(title);
  for(const parameter of selections.filter(s=>s.label!=='Component'&&s.text))await expect(sheet.locator('dl')).toContainText(parameter.text!);
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));});
  expect(await sheet.evaluate(el=>el.scrollHeight<=Math.ceil(el.getBoundingClientRect().height))).toBe(true);
  await capturePrint(page,{path:info.outputPath(`${route}-normal-a4.pdf`),preferCSSPageSize:true,printBackground:true});
  const record=info.outputPath('captured-selection.json');
  await writeFile(record,JSON.stringify({route,revision,title,selections,viewport:page.viewportSize(),baseURL:info.project.use.baseURL},null,2));
  await info.attach('captured-selection',{path:record,contentType:'application/json'});
  await finishPrint(page);
});
