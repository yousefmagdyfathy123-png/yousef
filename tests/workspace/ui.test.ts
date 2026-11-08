import { expect,test,vi } from 'vitest';
vi.mock('server-only',()=>({}));
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialState } from '../../src/legacy/state/initial';
import { projectWorkspaceUi } from '../../src/server/engineering/public-ui';
import { Workspace } from '../../src/workspace/Workspace';
import { toPublicWorkResult } from '../../src/server/engineering/public-result';
import { loadFlangeCases } from '../reference/flange-cases';
import type { WorkResult } from '../../src/legacy/contracts';
const view=loadFlangeCases('Flan1')[0].expected.view;
export function fixture(){const state=createInitialState({name:'en-US',decimalSeparator:'.',groupSeparator:','});state.values.TabbCount=1;state.values.TabbQty=7;state.legacySession!.lastView=structuredClone(view);return {state,view:structuredClone(view),trace:[],evidenceIds:[]} as WorkResult;}
test('public UI preserves source menu order, hidden menus, settings and source navigation guards',()=>{
  const r=fixture();r.state.values.TabbCount=1;r.state.values.TabbQty=7;
  const ui=projectWorkspaceUi(r.state);
  expect(ui.items.find(x=>x.id==='MenuStrip1')?.children).toEqual(['OptionsToolStripMenuItem','AboutToolStripMenuItem','ToolStripMenuItem1','ToolStripMenuItem2']);
  expect(ui.items.find(x=>x.id==='ToolStripButton1')?.effect.kind).toBe('none');
  expect(ui.items.find(x=>x.id==='ToolStripButton4')?.effect).toEqual({kind:'work',action:{type:'select-route',routeId:'Flan7'}});
  expect(ui.items.find(x=>x.id==='PwalToolStripMenuItem')?.visible).not.toBe(true);
  expect(ui.settings).toEqual({units:'Metric',listUnits:'Inches',temperature:'Celsius',fractions:false});
  expect(JSON.stringify(ui)).not.toMatch(/sourceRefs|sourceHash|audit\/|legacyBuffers/);
});
test('workspace renders semantic controls and menu instead of a Flan1-only component list',()=>{
  const r=fixture(),dto=toPublicWorkResult('test',r);dto.ui=projectWorkspaceUi(r.state);
  const html=renderToStaticMarkup(createElement(Workspace,{initial:dto,onAction:async()=>dto}));
  expect(html).toContain('Component navigation');expect(html).toContain('Slip-on Flange');
  expect(html).toContain('Results');expect(html).toContain('Print');expect(html).toContain('About');
  expect(html).not.toContain('>ToolStripMenuItem1<');expect(html).toContain('>Back<');expect(html).toContain('>Forward<');
  expect(html).not.toContain('sourceRefs');
});
test('source-hidden family title is hidden from the rendered navigation and focus order',()=>{
  const r=fixture();r.state.routeId='Flbs1';r.state.values.TabbQty=1;const dto=toPublicWorkResult('hidden',r);
  expect(dto.ui!.items.find(c=>c.id==='Combo1')?.visible).toBe(false);
  const html=renderToStaticMarkup(createElement(Workspace,{initial:dto,onAction:async()=>dto}));
  expect(html).toMatch(/<select[^>]*aria-label="Component"[^>]*hidden=""/);
});
