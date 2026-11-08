import { expect, test } from 'vitest';
import { normalizeView } from '../reference/normalize';
import { assertReferenceFixture } from '../reference/schema';
import type { WorkResult } from '../../src/legacy/contracts';
import fixtures from '../reference/imported/lexical-cells.json';
test('reference normalization retains original state, coordinate trace, order and exact numeric/text values', () => {
  const sparse: Record<number,Record<number,Record<number,string>>> = { 1: { 99: { 3: '0+1/2', 8: '', 9: 'N/A' } } };
  const result: WorkResult = { state: { routeId: 'Flan1', culture: { name:'en-US', decimalSeparator:'.', groupSeparator:',' }, values:{zero:-0,invalid:NaN,infinite:Infinity,text:' x '},history:{ids:['Flan2','Flan1'],index:1},legacyBuffers:{activeDba:sparse,lineMem:{}},revision:7}, view:{headers:['B','A'],controls:[],drawing:{width:100,height:200,transform:[1,0,0,1,0,0],commands:[{op:'text',text:'N/A',x:-0,y:0,font:'Arial',align:'left',color:'blue'}]},messages:['one','two'],visibility:{drawing:true}}, evidenceIds:['e2','e1'],trace:[{operation:'read',sourceId:'Flan/Flg150.csv',row:99,column:8,value:''},{operation:'read',sourceId:'Flan/Flg150.csv',row:99,column:9,value:'N/A'}] };
  const actual = normalizeView(result);
  expect(actual.trace).toEqual(result.trace);
  expect(actual.view).toEqual(result.view);
  expect(actual.state.legacyBuffers).toEqual(result.state.legacyBuffers);
  expect(actual.state.history.ids).toEqual(['Flan2','Flan1']);
  expect(Object.is(actual.state.values.zero,-0)).toBe(true);
  expect(Number.isNaN(actual.state.values.invalid)).toBe(true);
  expect(actual.state.values.infinite).toBe(Infinity);
  expect(Object.hasOwn(actual.state.legacyBuffers.activeDba[1],98)).toBe(false);
  result.state.legacySession={settings:{Flan:{MainSize:8,AmbTemp:-0}},lastView:null};
  result.view.textResults={status:'available',rows:[{id:'wall',label:'Wall',value:'0.06"',unit:'in'}]};
  result.searchHits=[{id:'Pipe1',text:'Pipe'}];
  const extended=normalizeView(result);
  expect(extended.state.legacySession?.settings.Flan.MainSize).toBe(8);
  expect(Object.is(extended.state.legacySession?.settings.Flan.AmbTemp,-0)).toBe(true);
  expect(extended.view.textResults).toEqual({status:'available',rows:[{id:'wall',label:'Wall',value:'0.06"',unit:'in'}]});
  expect(extended.searchHits).toEqual([{id:'Pipe1',text:'Pipe'}]);
});
test('reference fixtures require pinned source coordinates, explicit culture and expected output', () => {
  const fixture=fixtures.cases[0]; expect(()=>assertReferenceFixture(fixture)).not.toThrow();
  for (const field of ['sourceRefs','expected','culture']) {
    const invalid: Record<string,unknown>={...fixture}; delete invalid[field];
    expect(()=>assertReferenceFixture(invalid)).toThrow();
  }
  expect(()=>assertReferenceFixture({...fixture,sourceRefs:[]})).toThrow();
  expect(()=>assertReferenceFixture({...fixture,culture:'ar-EG'})).toThrow();
});
