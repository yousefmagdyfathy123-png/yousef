import { expect,test } from 'vitest';
import { readFileSync,existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { calculatorRoutes } from '../../src/legacy/features/calculators';
import { wallPath } from '../../src/legacy/features/calculators/wall';
import { pressurePath } from '../../src/legacy/features/calculators/pressure';
import { registerRoutes } from '../../src/legacy/registry';
import { flangeRoutes } from '../../src/legacy/features/flanges';
import { gasketRoutes } from '../../src/legacy/features/gaskets';
import { pipeRoutes } from '../../src/legacy/features/pipe';
import { fittingRoutes } from '../../src/legacy/features/fittings';
import { branchRoutes } from '../../src/legacy/features/branches';
import { valveRoutes } from '../../src/legacy/features/valves';
import { strainerRoutes } from '../../src/legacy/features/strainers';
import { fastenerRoutes } from '../../src/legacy/features/fasteners';
import ids from '../../src/legacy/route-ids.json';
const hash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
for(const route of calculatorRoutes)test(route.id+' pins source/IL/data and independent fixture identities',()=>{
  const card=JSON.parse(readFileSync('evidence/calculators/'+route.id+'.json','utf8'));
  expect(card.classification.dispatch).toBe(true);expect(card.classification.uiRoutes).toBe(true);expect(card.classification.search).toBe(!['Comp1','Psiz1'].includes(route.id));
  expect(hash(card.fixtures.path)).toBe(card.fixtures.hash);expect(hash(card.framework.path)).toBe(card.framework.hash);
  const fixture=JSON.parse(readFileSync(card.fixtures.path,'utf8'));expect(fixture.cases.length).toBe(card.fixtures.cases);
  expect(fixture.cases.filter((c:{expected:{available:boolean}})=>!c.expected.available).length).toBe(card.fixtures.unavailableCases);
  const methods=JSON.parse(readFileSync('../audit/executable/methods.json','utf8'));
  for(const a of card.methods){const m=methods.find((m:{type:string;name:string})=>m.type==='Pipedata_Pro_14_1.Module1'&&m.name===a.method);expect(m.il_sha256).toBe(a.ilSha256);expect(m.rva).toBe(a.sourceRef.rva);expect(hash('../'+a.sourceRef.path)).toBe(a.sourceRef.hash);}
  for(const d of card.dataSources)expect(hash('../'+d.path)).toBe(d.hash);
  for(const t of card.tests)expect(existsSync(t)).toBe(true);
});
test('family exports now cover exactly167 dispatch routes; workspace assembly remains Task10',()=>{
  const all=[...flangeRoutes,...gasketRoutes,...pipeRoutes,...fittingRoutes,...branchRoutes,...valveRoutes,...strainerRoutes,...fastenerRoutes,...calculatorRoutes];
  expect(all.map(r=>r.id).sort()).toEqual([...ids.dispatch].sort());expect(all).toHaveLength(167);
  const registry=registerRoutes(all);expect(ids.dispatch.filter(id=>registry.classify(id)!=='implemented')).toEqual([]);
});
test('isolated Framework fixture pins both sources and its reproducible helper',()=>{
  const f=JSON.parse(readFileSync('tests/reference/calculators/framework.json','utf8'));
  expect(hash('tools/evidence/calculators-framework-reference.ps1')).toBe(f.helperSha256);
  expect(hash('../audit/executable/Pipedata_Pro_14_1.Module1.cs')).toBe(f.sourceSha256);
  expect(hash('../audit/executable/Pipedata_Pro_14_1.frmDataInput_Fxly.cs')).toBe(f.dialogSha256);
  expect(f.runtime.startsWith('4.')).toBe(true);expect(f.culture).toBe('en-US');
});
test('constructed pressure/wall menus cannot reach dead helper arithmetic',()=>{
  const source=readFileSync('../audit/executable/Pipedata_Pro_14_1.Module1.cs','utf8');
  const form=readFileSync('../audit/executable/Pipedata_Pro_14_1.frmPipedata.cs','utf8');
  const classify=JSON.parse(readFileSync('evidence/calculators/pressure-wall-classification.json','utf8'));
  expect(classify.deadHelpersNotActivated).toBe(true);
  expect([...source.matchAll(/\bPwal1\s*\(/g)].length).toBe(1);expect([...source.matchAll(/\bPtemCalculate\s*\(/g)].length).toBe(1);
  expect([...source.matchAll(/\bPwalCalculate\s*\(/g)].length).toBe(2);
  for(const p of [wallPath,pressurePath]){
    expect(registerRoutes(calculatorRoutes).classify(p.routeId)).toBe('no-dispatch');expect(p.helperReachable).toBe(false);
    const handler=form.match(new RegExp('private void '+p.menu+'_Click[\\s\\S]*?(?=\\n\\tprivate )'))![0];
    expect(handler).toContain('Module1.Clicker()');expect(handler).toContain('Module1.LoadActiveSubSector()');
  }
});
