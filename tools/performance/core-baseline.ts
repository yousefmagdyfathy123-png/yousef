import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { cpus, platform, release, totalmem } from 'node:os';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { loadCatalog } from '../../src/server/catalog';
import { requireLegacyCulture } from '../../src/server/legacy-culture';
import { toPublicWorkResult } from '../../src/server/engineering/public-result';
import { advanceWorkspaceUi } from '../../src/server/engineering/ui-state';
import { createInitialState } from '../../src/legacy/state/initial';
import { loadConfig } from '../../src/legacy/state/configure';
import { applyDefaultSettings, saveSettings } from '../../src/legacy/state/settings';
import { encodeWorkState } from '../../src/legacy/state/codec';
import { transition } from '../../src/legacy/state/transition';
import type { DisplayList, DrawCommand, WorkState } from '../../src/legacy/contracts';
import { loadFlangeCases } from '../../tests/reference/flange-cases';

const culture = requireLegacyCulture(process.env);
const samples = 15;
const warmups = 3;
const catalogPath = resolve('private/catalog');
const initial = () => createInitialState(culture);
const calculator = JSON.parse(readFileSync('tests/reference/calculators/Psiz1.json','utf8')) as {
  cases: {id:string; initial:WorkState['values']; expected:{files:string[];view:{headers:string[];drawing:DisplayList & {geometryRef:string}}}}[];
  geometries: Record<string, DrawCommand[]>;
};
const calc = calculator.cases[0];
const { geometryRef, ...calcDrawing } = calc.expected.view.drawing;
calcDrawing.commands = [...calcDrawing.commands, ...calculator.geometries[geometryRef]];
const calculatorState = initial();
calculatorState.routeId = 'Psiz1';
applyDefaultSettings(calculatorState);
Object.assign(calculatorState.values,calc.initial);
loadConfig(calculatorState);
saveSettings(calculatorState);
const workloads = [
  ...['Flan1','Flhb1'].map(routeId => {
    const fixture = loadFlangeCases(routeId)[0];
    return {routeId, state:initial(), fixtureId:fixture.id, files:fixture.expected.files, ...fixture.expected.view};
  }),
  {routeId:'Psiz1', state:calculatorState, fixtureId:calc.id, files:calc.expected.files, headers:calc.expected.view.headers, drawing:calcDrawing},
];

function distribution(values: number[]) {
  const sorted = [...values].sort((a,b)=>a-b);
  return {samples:values.length, min:sorted[0], median:sorted[Math.floor(sorted.length/2)], p95:sorted[Math.ceil(sorted.length*.95)-1], max:sorted.at(-1)};
}

const bundle = await build({
  entryPoints:['src/workspace/render-canvas.ts'], bundle:true, write:false, format:'iife', globalName:'baselineRenderer',
});
const browser = await chromium.launch({channel:'chrome'});
try {
  const page = await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  await page.setContent('<canvas></canvas>');
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  const cases = [];
  const coldCatalogManifestSamples:number[] = [];
  let catalogVersion:{revision:string;parser:string} | undefined;
  for (const workload of workloads) {
    const begin = performance.now();
    const catalog = await loadCatalog(catalogPath);
    coldCatalogManifestSamples.push(performance.now()-begin);
    catalogVersion ??= {revision:catalog.revision,parser:catalog.manifest.parserVersion};
    let state = workload.state;
    const run = (expectedFiles: string[]) => {
      const begin = performance.now();
      const result = transition(state,{type:'select-route',routeId:workload.routeId},catalog);
      const ms = performance.now()-begin;
      assert.equal(result.state.routeId,workload.routeId);
      assert.deepEqual(result.view.headers,workload.headers);
      assert.deepEqual(result.view.drawing,workload.drawing);
      assert.deepEqual(result.trace.filter(event=>event.operation==='load-bank').map(event=>event.sourceId),expectedFiles);
      advanceWorkspaceUi(state,result);
      state = result.state;
      return {result,ms};
    };
    const first = run(workload.files);
    // Flhb1's first call clamps the source default size and reloads the bank.
    // Subsequent calls use the saved size and read the bank once.
    const warmFiles = workload.routeId==='Flhb1' ? workload.files.slice(0,1) : workload.files;
    for (let i=0;i<warmups;i++) run(warmFiles);
    const timings:number[] = [];
    const memory = [process.memoryUsage()];
    let latest = first.result;
    for (let i=0;i<samples;i++) {
      const sample = run(warmFiles);
      timings.push(sample.ms);
      latest = sample.result;
      memory.push(process.memoryUsage());
    }
    const dto = toPublicWorkResult('core-performance-baseline',latest,catalog);
    const paint = await page.evaluate(async ({drawing,samples,warmups}) => {
      const { renderCanvas } = (globalThis as unknown as {baselineRenderer:typeof import('../../src/workspace/render-canvas')}).baselineRenderer;
      const canvas = document.querySelector('canvas')!;
      const ctx = canvas.getContext('2d')!;
      const timings:number[] = [];
      for (let i=0;i<samples+warmups;i++) {
        await new Promise(requestAnimationFrame);
        const begin = performance.now();
        renderCanvas(ctx,drawing,devicePixelRatio);
        // A single-pixel read forces completion of pending Canvas raster work.
        ctx.getImageData(0,0,1,1);
        if (i>=warmups) timings.push(performance.now()-begin);
      }
      const pixels = ctx.getImageData(0,0,canvas.width,canvas.height).data;
      return {timings,width:canvas.width,height:canvas.height,hasInk:pixels.some((value,index)=>index%4!==3&&value<250)};
    },{drawing:dto.view.drawing,samples,warmups});
    assert.deepEqual([paint.width,paint.height,paint.hasInk],[dto.view.drawing.width,dto.view.drawing.height,true]);
    cases.push({
      routeId:workload.routeId, fixtureId:workload.fixtureId, firstTransitionMs:first.ms,
      warmTransitionMs:distribution(timings), browserCanvasRasterWithFlushMs:distribution(paint.timings),
      commandCount:dto.view.drawing.commands.length,
      stateBytes:Buffer.byteLength(JSON.stringify(encodeWorkState(latest.state))),
      publicDtoBytes:Buffer.byteLength(JSON.stringify(dto)),
      processMemoryBytes:{
        before:memory[0], after:memory.at(-1),
        peakRss:Math.max(...memory.map(value=>value.rss)), peakHeapUsed:Math.max(...memory.map(value=>value.heapUsed)),
      },
    });
  }
  assert.ok(catalogVersion);
  const report = {
    schemaVersion:1, capturedAt:new Date().toISOString(),
    scope:'Local core baseline. Browser Canvas raster includes synchronous pixel flush and excludes network, React and compositor frame latency.',
    hardware:{cpu:cpus()[0]?.model,logicalCpus:cpus().length,memoryBytes:totalmem()},
    versions:{
      os:platform()+' '+release(), node:process.version, v8:process.versions.v8, chrome:browser.version(),
      engine:JSON.parse(readFileSync('package.json','utf8')).version,
      engineBaseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
      catalog:catalogVersion.revision, parser:catalogVersion.parser,
    },
    browserViewport:{width:1440,height:900,dpr:1}, warmupsPerCase:warmups,
    coldCatalogManifestMs:distribution(coldCatalogManifestSamples),
    catalogLoadNotes:'Fresh catalog instance per workload. Manifest open and validation are timed separately. Each first transition includes lazy table reads. OS filesystem caches are uncontrolled.',
    cases,
  };
  writeFileSync('evidence/performance/core-baseline.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(cases.map(({routeId,commandCount,warmTransitionMs,browserCanvasRasterWithFlushMs})=>({routeId,commandCount,warmTransitionMs,browserCanvasRasterWithFlushMs})),null,2));
} finally {
  await browser.close();
}
