import { expect,test } from 'vitest';
import { readFileSync,existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fittingRoutes } from '../../src/legacy/features/fittings';
import { pipeRoutes } from '../../src/legacy/features/pipe';
import { branchRoutes } from '../../src/legacy/features/branches';
import { registerRoutes } from '../../src/legacy/registry';
import ids from '../../src/legacy/route-ids.json';
const routes=[...fittingRoutes,...pipeRoutes,...branchRoutes];
test('Task7 includes exactly all80 dispatched fitting, pipe and welded branch routes',()=>{
  expect(fittingRoutes).toHaveLength(53);expect(pipeRoutes).toHaveLength(2);expect(branchRoutes).toHaveLength(25);
  const families=['Ftbw','Ftsc','Ftsw','Fswa','Pipe','Piwt','Wbol','Wbpi'];
  expect(routes.map(r=>r.id).sort()).toEqual(ids.dispatch.filter(id=>families.includes(id.slice(0,4))).sort());
  const source=JSON.parse(readFileSync('evidence/route-index.json','utf8'));
  const sourceIds=(kind:string)=>source[kind].filter((r:{id:string})=>families.includes(r.id.slice(0,4))).map((r:{id:string})=>r.id).sort();
  expect(sourceIds('uiRoutes')).toEqual(routes.filter(r=>!r.id.startsWith('Wbpi')).map(r=>r.id).sort());
  expect(sourceIds('search')).toEqual(routes.filter(r=>r.id!=='Piwt1').map(r=>r.id).sort());
  const registry=registerRoutes(routes);
  expect(registry.get('Ftsc29')).toBeUndefined();expect(registry.get('Ftsw15')).toBeUndefined();
  expect(registry.classify('Vlfl1')).toBe('pending');
});
test.each(routes)('$id has independently pinned source/IL, data hashes and fixture counts',route=>{
  const card=JSON.parse(readFileSync('evidence/fittings-pipe-branches/'+route.id+'.json','utf8'));
  const bytes=readFileSync(card.fixtures.path),fixture=JSON.parse(bytes.toString('utf8'));
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(card.fixtures.hash);
  expect(fixture.cases).toHaveLength(card.fixtures.cases);
  expect(fixture.cases.filter((c:{expected:{available:boolean}})=>!c.expected.available)).toHaveLength(card.fixtures.unavailableCases);
  expect(card.methods.some((a:{method:string})=>a.method===route.id)).toBe(true);
  const methods=JSON.parse(readFileSync('../audit/executable/methods.json','utf8'));
  for(const anchor of card.methods){
    const method=methods.find((m:{type:string;name:string})=>m.type==='Pipedata_Pro_14_1.Module1'&&m.name===anchor.method);
    expect(anchor.ilSha256).toBe(method.il_sha256);expect(anchor.sourceRef.rva).toBe(method.rva);
  }
  for(const data of card.dataSources)expect(createHash('sha256').update(readFileSync('../'+data.path)).digest('hex')).toBe(data.hash);
  for(const path of card.tests)expect(existsSync(path)).toBe(true);
  const category=route.id.startsWith('Wb')?'branches':['Pipe1','Piwt1'].includes(route.id)?'pipe':'fittings';
  expect(existsSync('src/legacy/features/'+category+'/'+route.id.slice(0,4).toLowerCase()+'/'+route.id+'.ts')).toBe(true);
});
