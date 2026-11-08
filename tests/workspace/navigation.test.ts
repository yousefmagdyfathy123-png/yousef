import { expect,test,vi } from 'vitest';
import { resolve } from 'node:path';
import { loadCatalog } from '../../src/server/catalog';
import { createInitialState } from '../../src/legacy/state/initial';
import { transition } from '../../src/legacy/state/transition';
import { encodeWorkState,decodeWorkState } from '../../src/legacy/state/codec';
import { advanceWorkspaceUi } from '../../src/server/engineering/ui-state';
import { toPublicWorkResult } from '../../src/server/engineering/public-result';
import type { WorkState,WorkAction } from '../../src/legacy/contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Workspace } from '../../src/workspace/Workspace';
vi.mock('server-only',()=>({}));
const catalog=await loadCatalog(resolve('private/catalog'));
const initial=()=>createInitialState({name:'en-US',decimalSeparator:'.',groupSeparator:','});
function run(state:WorkState,action:WorkAction){const r=transition(state,action,catalog);advanceWorkspaceUi(state,r);return r;}
test('source SortNavigationButtons overrides designer visibility and family toolbar width',()=>{
  for(const [id,width,arrows,tools] of [['Flan1',220,true,true],['Gflt1',400,true,true],['Ftsc1',275,true,true],['Srra1',270,true,true],['Fxly1',220,false,true],['Gpas4',275,true,false]] as const){
    const r=run(initial(),{type:'select-route',routeId:id}),ui=toPublicWorkResult('nav',r,catalog).ui!;
    expect(ui.navigationWidth,id).toBe(width);expect(ui.items.find(x=>x.id==='ToolStripButton4')?.visible,id).toBe(arrows);
    expect(ui.items.find(x=>x.id==='ToolStripButton17')?.visible,id).toBe(tools);
  }
});
test('wide navigation composes controls separately while retaining source values and coordinates',()=>{
  const r=run(initial(),{type:'select-route',routeId:'Gflt1'}),dto=toPublicWorkResult('wide',r,catalog);
  const html=renderToStaticMarkup(createElement(Workspace,{initial:dto,onAction:async()=>dto}));
  expect(html).toContain('class="engineering-toolbar"');
  expect(html).toMatch(/aria-label="Component"/);
  expect(html).toMatch(/aria-label="Size"/);
  expect(html).not.toContain('left:530px');
  expect(dto.view.drawing).toEqual(r.view.drawing);
});
test('Srrb3 keeps the prior source title without inventing a third Basket menu entry',()=>{
  const first=run(initial(),{type:'select-route',routeId:'Flan1'}),basket=run(first.state,{type:'select-route',routeId:'Srrb3'});
  const dto=toPublicWorkResult('title',basket,catalog);
  expect(dto.ui!.selectedTabId).toBe('');expect(dto.ui!.titleText).toBe('Weldneck Flange');
  expect(dto.ui!.tabs.map(x=>x.id)).toEqual(['Srrb1','Srrb2']);
  const html=renderToStaticMarkup(createElement(Workspace,{initial:dto,onAction:async()=>dto}));
  expect(html).toContain('hidden="" selected="">Weldneck Flange</option>');
});
test('WhiteBlock retains prior navigation width; private UI state survives the codec and stays private',()=>{
  const gasket=run(initial(),{type:'select-route',routeId:'Gflt1'}),before=structuredClone(gasket.state);
  const flange=run(decodeWorkState(encodeWorkState(gasket.state)),{type:'select-route',routeId:'Flan1'});
  const size=run(flange.state,{type:'select-option',controlId:'ASMEClass',value:'150#'});
  const small=run(size.state,{type:'select-option',controlId:'MainSize',value:'5'});
  const rtj=run(small.state,{type:'select-option',controlId:'Face',value:'RTJ'});
  expect(rtj.view.textResults?.status).toBe('unavailable');expect(toPublicWorkResult('nav',rtj,catalog).ui!.navigationWidth).toBe(220);
  // Carry the same unavailable settings through a wide source toolbar.
  const wide=run(rtj.state,{type:'select-route',routeId:'Gflt1'}),unavailable=run(wide.state,{type:'select-route',routeId:'Flan1'});
  expect(unavailable.view.textResults?.status).toBe('unavailable');const dto=toPublicWorkResult('nav',unavailable,catalog);
  expect(dto.ui!.navigationWidth).toBe(400);expect(gasket.state).toEqual(before);expect(JSON.stringify(dto)).not.toContain('UiNavigation');
  const none=run(unavailable.state,{type:'select-route',routeId:'Blnd1'}),noDto=toPublicWorkResult('nav',none,catalog);
  expect(noDto.ui!.navigationWidth).toBe(400);expect(noDto.ui!.selectedTabId).toBe('Flan1');
  expect(noDto.ui!.tabs[0]).toEqual({id:'Flan1',text:'Weldneck Flange'});
  expect(noDto.ui!.items.find(c=>c.id==='ToolStripButton3')?.effect).toEqual({kind:'work',action:{type:'select-route',routeId:'Flan2'}});
});
