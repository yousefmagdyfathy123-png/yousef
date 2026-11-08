import { expect,test } from 'vitest';
import { valveRoutes } from '../../src/legacy/features/valves';
import { strainerRoutes } from '../../src/legacy/features/strainers';
import { fastenerRoutes } from '../../src/legacy/features/fasteners';
import ids from '../../src/legacy/route-ids.json';
import { registerRoutes } from '../../src/legacy/registry';
import { readFileSync,existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
export const families=['Vlfl','Vlbw','Vlsc','Vlsw','Srra','Srrb','Srrc','Srrd','Srre','Blnu','Nuts'];
test.each(ids.dispatch.filter(id=>families.includes(id.slice(0,4))))('%s has an implementation',id=>{
  expect(registerRoutes([...valveRoutes,...strainerRoutes,...fastenerRoutes]).classify(id)).toBe('implemented');
});
test('Task8 implements exactly all38 required dispatch routes',()=>{
  const routes=[...valveRoutes,...strainerRoutes,...fastenerRoutes];
  expect(valveRoutes).toHaveLength(22);expect(strainerRoutes).toHaveLength(10);expect(fastenerRoutes).toHaveLength(6);
  expect(routes.map(r=>r.id).sort()).toEqual(ids.dispatch.filter(id=>families.includes(id.slice(0,4))).sort());
  const registry=registerRoutes(routes);
  for(const id of ids.dispatch.filter(id=>families.includes(id.slice(0,4))))expect(registry.classify(id)).toBe('implemented');
  for(const id of ['Blnd1','Blnd2','Blnd3','Blnd4'])expect(registry.get(id)).toBeUndefined();
  const index=JSON.parse(readFileSync('evidence/route-index.json','utf8'));
  const sourceIds=(kind:string)=>index[kind].filter((r:{id:string})=>families.includes(r.id.slice(0,4))).map((r:{id:string})=>r.id).sort();
  expect(sourceIds('uiRoutes')).toEqual(routes.filter(r=>r.id!=='Srrb3').map(r=>r.id).sort());
  expect(sourceIds('search')).toEqual(routes.map(r=>r.id).sort());
});
test.each(ids.dispatch.filter(id=>families.includes(id.slice(0,4))))('%s has pinned source/IL, original data and independent fixtures',id=>{
  const card=JSON.parse(readFileSync('evidence/valves-strainers-fasteners/'+id+'.json','utf8'));
  const bytes=readFileSync(card.fixtures.path),fixture=JSON.parse(bytes.toString('utf8'));
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(card.fixtures.hash);
  expect(fixture.cases).toHaveLength(card.fixtures.cases);
  expect(fixture.cases.filter((c:{expected:{available:boolean}})=>!c.expected.available)).toHaveLength(card.fixtures.unavailableCases);
  const methods=JSON.parse(readFileSync('../audit/executable/methods.json','utf8'));
  for(const anchor of card.methods){
    const source=methods.find((m:{type:string;name:string})=>m.type==='Pipedata_Pro_14_1.Module1'&&m.name===anchor.method);
    expect(anchor.ilSha256).toBe(source.il_sha256);expect(anchor.sourceRef.rva).toBe(source.rva);
  }
  for(const data of card.dataSources)expect(createHash('sha256').update(readFileSync('../'+data.path)).digest('hex')).toBe(data.hash);
  for(const path of card.tests)expect(existsSync(path)).toBe(true);
  const category=id.startsWith('Vl')?'valves':id.startsWith('Srr')?'strainers':'fasteners';
  expect(existsSync('src/legacy/features/'+category+'/'+id.slice(0,4).toLowerCase()+'/'+id+'.ts')).toBe(true);
});
