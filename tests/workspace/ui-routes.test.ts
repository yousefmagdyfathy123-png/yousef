import { expect,test,vi } from 'vitest';
import { resolve } from 'node:path';
import { loadCatalog } from '../../src/server/catalog';
import { createInitialState } from '../../src/legacy/state/initial';
import { transition } from '../../src/legacy/state/transition';
import { toPublicWorkResult } from '../../src/server/engineering/public-result';
import ids from '../../src/legacy/route-ids.json';
vi.mock('server-only',()=>({}));
const catalog=await loadCatalog(resolve('private/catalog'));
const initial=()=>createInitialState({name:'en-US',decimalSeparator:'.',groupSeparator:','});
test.each(ids.dispatch)('%s exposes strict public UI matching the same calculated view',routeId=>{
  const r=transition(initial(),{type:'select-route',routeId},catalog),dto=toPublicWorkResult('routes',r,catalog);
  expect(dto.ui?.routeId).toBe(routeId);expect(dto.view.headers).toEqual(r.view.headers);
  expect(dto.view.textResults).toEqual(r.view.textResults);expect(dto.view.controls.map(c=>c.id)).toEqual(r.view.controls.map(c=>c.id));
  expect(dto.ui?.items.some(c=>c.id==='ToolStripButton17'&&c.effect.kind==='host')).toBe(true);
});
test('source flexibility buttons open numeric dialogs instead of submitting formatted labels',()=>{
  const r=transition(initial(),{type:'select-route',routeId:'Fxly1'},catalog),dto=toPublicWorkResult('flex',r,catalog);
  const control=dto.view.controls.find(c=>c.id==='AmbTemp')!;
  expect(control.type).toBe('input');
  const item=dto.ui!.items.find(c=>c.id===control.id)!;
  expect(item.effect).toMatchObject({kind:'dialog',dialog:{id:'flexibility',fieldId:'AmbTemp',controls:[{value:'86'}]}});
});
test('class400 stays disabled on branch selector and public search hits retain source order',()=>{
  const branch=transition(initial(),{type:'select-route',routeId:'Wbpi10'},catalog);
  expect(toPublicWorkResult('branch',branch,catalog).view.controls.find(c=>c.id==='ASMEClass')!.options.find(o=>o.value==='400#')?.enabled).toBe(false);
  const found=transition(branch.state,{type:'search',query:'flange'},catalog),dto=toPublicWorkResult('branch',found,catalog);
  expect(dto.searchHits!.map(({id,text})=>({id,text}))).toEqual(found.searchHits);expect(dto.searchHits!.length).toBeGreaterThan(0);
});
test('span links use source dynamic text and the established bottom-header coordinates',()=>{
  for(const [routeId,text,y] of [['Span1','Rack Span parameters',578],['Span2','Process Area Span parameters',603]] as const){
    const r=transition(initial(),{type:'select-route',routeId},catalog),link=toPublicWorkResult('span',r,catalog).ui!.items.find(c=>c.id==='LinkLabel1')!;
    expect(link.text).toBe(text);expect(link.layout).toMatchObject({x:11,y});expect(link.visible).toBe(true);
  }
});
test('rejected source input exposes only its acceptance flag and messages',()=>{
  const r=transition(initial(),{type:'select-route',routeId:'Fxly1'},catalog);
  const failed=transition(r.state,{type:'input',fieldId:'Length',raw:'1'},catalog),dto=toPublicWorkResult('input',failed,catalog);
  expect(dto.inputAccepted).toBe(false);expect(dto.view.messages).toEqual(['Please enter a numerical value between 500 and 100000 mm']);
  expect(JSON.stringify(dto)).not.toContain('input-validation');
});
