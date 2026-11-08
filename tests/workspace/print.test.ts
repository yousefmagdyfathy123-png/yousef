import { expect,test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { printSnapshot,PrintView } from '../../src/workspace/PrintView';
import { loadFlangeCases } from '../reference/flange-cases';
import type { PublicWorkResult } from '../../src/shared/public-contracts';
const result=():PublicWorkResult=>({workspaceId:'print',revision:7,view:structuredClone(loadFlangeCases('Flan1')[0].expected.view)});
const markup=(snapshot:PublicWorkResult)=>renderToStaticMarkup(createElement(PrintView,{snapshot}));

test('print snapshot preserves the entire engineering result including source transform and later live mutations cannot change it',()=>{
  const live=result(),before=structuredClone(live),snapshot=printSnapshot(live);
  expect(snapshot).toEqual(before);expect(snapshot).not.toBe(live);
  live.view.drawing.transform[0]=999;live.view.drawing.commands.length=0;
  live.view.headers[0]='later revision';live.view.controls[0].text='changed';live.revision++;
  expect(snapshot).toEqual(before);
});
test('print includes engineering title and visible selected parameters without optional ui, tables or application furniture',()=>{
  const snapshot=printSnapshot(result());snapshot.view.controls.push({...snapshot.view.controls[0],id:'hidden',visible:false,text:'secret hidden selection'});
  const html=markup(snapshot);
  expect(html).toContain('data-print-revision="7"');expect(html).toContain('6&quot;NPS Weldneck Flange 300# RF Sch-STD');
  for(const text of ['Size','ASME Class','Face Type','Schedule','300#','STD'])expect(html).toContain(text);
  for(const text of ['secret hidden selection','<select','<button','<table','<footer','professional engineering review','Flange Wt'])expect(html).not.toContain(text);
});
test('long visible component title remains exact and hidden header never becomes the title',()=>{
  const snapshot=printSnapshot(result()),title='Very long engineering component Ø 1½ / 45° '.repeat(8);
  snapshot.view.headers[0]=title;expect(markup(snapshot)).toContain(title);
  snapshot.view.visibility.Label1=false;expect(markup(snapshot)).not.toContain(title);
});
test('hidden and unavailable drawings cannot print stale geometry, and retain unavailable messages',()=>{
  const hidden=result();hidden.view.visibility.drawing=false;
  expect(markup(hidden)).not.toContain('<canvas');
  const unavailable=result();unavailable.view.textResults={status:'unavailable',rows:[]};unavailable.view.messages=['Selection unavailable'];
  expect(markup(unavailable)).not.toContain('<canvas');expect(markup(unavailable)).toContain('Selection unavailable');
});
