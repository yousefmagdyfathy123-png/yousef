import { expect,test } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync,existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { flangeRoutes } from '../../src/legacy/features/flanges';
import { gasketRoutes } from '../../src/legacy/features/gaskets';
import { registerRoutes } from '../../src/legacy/registry';
import ids from '../../src/legacy/route-ids.json';
import { loadFlangeCases } from '../reference/flange-cases';
const routes=[...flangeRoutes,...gasketRoutes];
test('Task6 arrays contain exactly all39 dispatched flange and gasket recipes',()=>{
  expect(flangeRoutes).toHaveLength(30);expect(gasketRoutes).toHaveLength(9);
  const prefixes=['Flan','Flaa','Flap','Orif','Flre','Flco','Fl6b','Flbx','Fldi','Flhb','Flbs','Gflt','Gspr','Grtj'];
  expect(routes.map(r=>r.id).sort()).toEqual(ids.dispatch.filter(id=>prefixes.includes(id.slice(0,4))).sort());
  const source=JSON.parse(readFileSync(resolve('evidence/route-index.json'),'utf8'));
  const expected=routes.map(r=>r.id).sort();
  for(const entry of ['dispatch','uiRoutes'])expect(source[entry].filter((r:{id:string})=>prefixes.includes(r.id.slice(0,4))).map((r:{id:string})=>r.id).sort()).toEqual(expected);
  expect(source.search.filter((r:{id:string})=>prefixes.includes(r.id.slice(0,4))).map((r:{id:string})=>r.id).sort()).toEqual([...expected,'Fl6b3'].sort());
  const registry=registerRoutes(routes);
  for(const route of routes)expect(registry.classify(route.id)).toBe('implemented');
  expect(registry.classify('Fl6b3')).toBe('no-dispatch');
  expect(registry.classify('Pipe1')).toBe('pending');
});
test.each(routes)('$id has independently pinned fixtures and source/IL provenance',route=>{
  const methods=JSON.parse(readFileSync(resolve('../audit/executable/methods.json'),'utf8'));
    const evidence=JSON.parse(readFileSync(resolve('evidence/flanges-gaskets',route.id+'.json'),'utf8'));
    // Task6a predates the common card shape and retains its checkpoint metadata.
    const pinned=route.id==='Flan1'?evidence.independentFixtures:evidence.fixtures;
    const bytes=readFileSync(resolve(pinned.path)),cases=loadFlangeCases(route.id);
    if(route.id!=='Flan1')expect(evidence.routeId).toBe(route.id);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(pinned.hash);
    expect(cases.length).toBe(pinned.cases);
    expect(cases.filter(c=>!c.expected.available).length).toBe(pinned.unavailableCases);
    expect(evidence.methods.some((m:{method:string})=>m.method===route.id)).toBe(true);
    for(const anchor of evidence.methods){
      const method=methods.find((m:{type:string;name:string})=>m.type==='Pipedata_Pro_14_1.Module1'&&m.name===anchor.method);
      expect(anchor.ilSha256).toBe(method.il_sha256);expect(anchor.sourceRef.rva).toBe(method.rva);
    }
    for(const path of evidence.tests)expect(existsSync(resolve(path))).toBe(true);
    for(const fixture of cases)expect(fixture.actions).toEqual([{type:'select-route',routeId:route.id}]);
});
