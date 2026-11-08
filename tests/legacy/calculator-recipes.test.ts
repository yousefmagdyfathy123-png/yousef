import { expect,test,vi } from 'vitest';
import { readFileSync,readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { calculatorRoutes } from '../../src/legacy/features/calculators';
import { loadCatalog } from '../../src/server/catalog';
import { createInitialState } from '../../src/legacy/state/initial';
import { loadConfig } from '../../src/legacy/state/configure';
import { applyDefaultSettings,saveSettings,loadSettings } from '../../src/legacy/state/settings';
import { loadTitle } from '../../src/legacy/state/titles';
import type { LegacyView,DrawCommand } from '../../src/legacy/contracts';
vi.mock('server-only',()=>({}));
const catalog=await loadCatalog(resolve('private/catalog')),culture={name:'en-US',decimalSeparator:'.',groupSeparator:','};
for(const file of readdirSync('tests/reference/calculators').filter(f=>f!== 'framework.json'&&f.endsWith('.json'))){
  const fixture=JSON.parse(readFileSync('tests/reference/calculators/'+file,'utf8'));
  for(const c of fixture.cases)test(c.id+' matches independent source recipe, controls, banks and drawing',()=>{
    const id=c.actions[0].routeId,s=createInitialState(culture);s.routeId=id;applyDefaultSettings(s);Object.assign(s.values,c.initial);loadConfig(s);saveSettings(s);loadSettings(s);s.values.TempSign=c.initial.TempSign;loadTitle(s);
    const r=calculatorRoutes.find(r=>r.id===id)!.apply(s,{type:'select-route',routeId:id},catalog);
    expect(r.state.routeId).toBe(id);
    const expected=structuredClone(c.expected.view) as LegacyView;
    const drawing=expected.drawing as typeof expected.drawing & {geometryRef?:string};
    if(drawing.geometryRef){drawing.commands.push(...fixture.geometries[drawing.geometryRef] as DrawCommand[]);delete drawing.geometryRef;}
    // The independent source fixture predates the semantic guide output. Compare
    // every original row and drawing command unchanged; calculators.test.ts pins
    // the added row, its roles, exact rounded value, units, copy and persistence.
    const sourceView=id==='Fxly1'&&r.view.textResults?{...r.view,textResults:{...r.view.textResults,
      rows:r.view.textResults.rows.filter(row=>row.id!=='guide-distance').map(({kind,...row})=>row),
    }}:r.view;
    expect(sourceView).toEqual(expected);expect(r.state.values.MainSize).toBe(c.expected.mainSize);
    if(id.startsWith('Comp')||id.startsWith('Gpas'))expect(r.state.values.SmallSize).toBe(c.expected.smallSize);
    expect(r.trace.filter(t=>t.operation==='load-bank').map(t=>t.sourceId)).toEqual(c.expected.files);
    expect(c.expected.lineCounts.map((_:number,i:number)=>r.state.values['LineQtyDbase'+(i+1)])).toEqual(c.expected.lineCounts);
    const tuples=Object.entries(r.state.legacyBuffers.activeDba).flatMap(([b,rr])=>Object.entries(rr).flatMap(([row,cc])=>Object.entries(cc).map(([col,v])=>[Number(b),Number(row),Number(col),v])));
    expect(createHash('sha256').update(JSON.stringify(tuples)).digest('hex')).toBe(c.expected.bankFingerprint);
  });
}
