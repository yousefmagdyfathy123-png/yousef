import { describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import type { Catalog, LegacyBuffers, LegacyLine, LegacyTemplate } from '../../src/legacy/contracts';
import { parseLegacyDrawing } from '../../src/legacy/drawing/parse';
import { markerFor } from '../../src/legacy/drawing/markers';
import { buildDisplayList } from '../../src/legacy/drawing/display-list';
import { createInitialState } from '../../src/legacy/state/initial';
import { encodeWorkState, decodeWorkState } from '../../src/legacy/state/codec';
import { loadCatalog } from '../../src/server/catalog';
import corpus from '../reference/drawing/corpus.json';
import temperature from '../reference/drawing/temperature.json';
import { DrawingProtocolError } from '../../src/legacy/drawing/parse';
vi.mock('server-only',()=>({}));
const culture={name:'en-US',decimalSeparator:'.',groupSeparator:','};
const fresh=():LegacyBuffers=>({activeDba:{},lineMem:{}});
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
// Literal protocol records, not general DXF entities. Every fixed offset matters.
function bytes(color='3',x='10',end='14',entity='AcDbLine'):Uint8Array {
  return Buffer.from([...Array(26).fill('header'),'AcDbEntity','8','0','6','Continuous','62',color,'100',entity,'10',x,'20','20','30','0','11',end,'21','30','31','0','0','ENDSEC'].join('\r\n'));
}
const dummy:Catalog={revision:'test',table(){throw new Error('Unexpected table access');},template(){throw new Error('Unexpected template access');}};
function setup(color='5',x='10',end='14'){
  const parsed=parseLegacyDrawing(bytes(color,x,end),fresh());
  const state=createInitialState(culture);state.legacyBuffers=parsed.buffers;
  Object.assign(state.values,{MainSize:1,DrawDatum:100,Inchsign:'',Units:'Metric',Fractionize:'No'});
  state.legacyBuffers.activeDba={1:{1:{4:'12.345',100:' 90* ',26:'N/A'}},2:{1:{4:'7.625'}}};
  const template:LegacyTemplate={id:'test',sourceHash:'test',records:parsed.records};
  return {state,template};
}
describe('independent original drawing corpus',()=>{
  for(const file of corpus.files)test(file.id,()=>{
    const raw=readFileSync(resolve('..','Database',file.id));expect(sha(raw)).toBe(file.sourceHash);
    const parsed=parseLegacyDrawing(raw,fresh());expect(parsed.records).toHaveLength(file.count);
    const projection=parsed.records.map(r=>[r.tokenOffsets.start,r.sourceRefs[0].line,...[r.from.x,r.from.y,r.to.x,r.to.y].map(n=>Math.round(n*1000)),r.rawColor===null?'':String(r.rawColor),r.internalColor,markerFor(r)?.column??null]);
    expect(sha(JSON.stringify(projection))).toBe(file.fingerprint);
    expect(parsed.buffers.drawing?.sc).toBe(file.captured+1);
  });
});
test('fixed +8 acceptance never expands INSERT TEXT ARC or searches shifted AcDbLine',()=>{
  for(const entity of ['INSERT','TEXT','ARC','LWPOLYLINE'])expect(parseLegacyDrawing(bytes('3','1','2',entity),fresh()).records).toEqual([]);
  expect(parseLegacyDrawing(bytes(),fresh()).records).toHaveLength(1);
  expect(parseLegacyDrawing(Buffer.from(Buffer.from(bytes()).toString().replace('100\r\nAcDbLine','100\r\nextra\r\nAcDbLine')),fresh()).records).toHaveLength(0);
});
test('bank1 abs versus bank2 signed Single deltas and raw bank1 markers',()=>{
  expect(markerFor(parseLegacyDrawing(bytes('5','14','10'),fresh()).records[0])).toEqual({bank:1,column:4,raw:false});
  expect(markerFor(parseLegacyDrawing(bytes('6','14','10'),fresh()).records[0])).toEqual({bank:2,column:-4,raw:false});
  expect(markerFor(parseLegacyDrawing(bytes('2'),fresh()).records[0])).toEqual({bank:1,column:4,raw:true});
});
test('partial clearing and inclusive sc preserve prior tokens beyond 20000 without mutating caller',()=>{
  const prior=fresh();prior.lineMem[1001]={2:'42',6:'7'};prior.lineMem[0]={2:null};
  const tail=[...Buffer.from(bytes()).toString().split(/\r\n/).slice(26),'padding','padding'];
  prior.drawing={lineVar2:Object.fromEntries(tail.map((t,i)=>[20001+i,t])),c:0,colr:1,linetype:0,sc:1,lc:1,factor:0};
  const raw=Buffer.from([...Array(26).fill('header'),...Array(800).fill(tail.slice(0,25)).flat()].join('\n'));
  const parsed=parseLegacyDrawing(raw,prior);
  expect(parsed.buffers.drawing?.sc).toBe(20001);expect(parsed.records).toHaveLength(801);
  expect(parsed.buffers.lineMem[1001]).toEqual({2:'42',6:'7'});expect(parsed.buffers.lineMem[0]).toEqual({2:null});
  expect(prior.lineMem[1]).toBeUndefined();expect(prior.drawing.colr).toBe(1);
});
test('drawing continuation survives private codec including sparse token zero and stale line 1001',()=>{
  const {state}=setup();state.legacyBuffers.lineMem[1001]={2:'12',6:'7'};
  state.legacyBuffers.drawing!.lineVar2[0]=null;state.legacyBuffers.drawing!.lineVar2[20002]='AcDbEntity';
  const restored=decodeWorkState(encodeWorkState(state));expect(restored).toEqual(state);
  expect(parseLegacyDrawing(bytes('92'),restored.legacyBuffers)).toEqual(parseLegacyDrawing(bytes('92'),state.legacyBuffers));
});
test.each(['N/A','SPA'])('numeric marker guards %s and draws mask/text before linework',cell=>{
  const {state,template}=setup();state.legacyBuffers.activeDba[1][1][4]=cell;
  const list=buildDisplayList(state,template,dummy,{width:1067,height:690});
  expect(list.transform).toEqual([Math.fround(.6),0,0,Math.fround(.6),.5,105]);
  expect(list.commands.slice(0,2)).toEqual([{op:'fillRect',x:-70,y:70,width:160,height:30,color:'#ffffff'},{op:'text',text:cell,x:10,y:72,font:'bold 16pt Verdana',align:'center',color:'#062134'}]);
  expect(list.commands.at(-1)).toMatchObject({op:'line',color:'#000044'});
});
test('numeric bank formatting, raw degree strings, masks and column100 far alignment',()=>{
  const a=setup();expect(buildDisplayList(a.state,a.template,dummy,{width:1067,height:690}).commands[1]).toMatchObject({text:'12.34'});
  const b=setup('6');expect(buildDisplayList(b.state,b.template,dummy,{width:1067,height:690}).commands[1]).toMatchObject({text:'7.62'});
  const c=setup('2','10','110');expect(buildDisplayList(c.state,c.template,dummy,{width:1067,height:690}).commands[1]).toMatchObject({text:'90°',align:'right',verticalAlign:'bottom',font:'bold 28pt Verdana'});
});
test('negative signed bank lookup fails with source drawing error, never clamped',()=>{
  const {state,template}=setup('6','14','10');expect(()=>buildDisplayList(state,template,dummy,{width:1067,height:690})).toThrow('Drawing bank index');
});
test('Ptem crosshair repeats after each ordinary line including inclusive terminal blank',()=>{
  const {state,template}=setup('3');state.routeId='Ptem1';Object.assign(state.values,{DesTemp:100,TempSign:'C',DesignPressure:20,ASMEClass:'150#'});
  const list=buildDisplayList(state,template,dummy,{width:1067,height:690});
  expect(list.commands.filter(c=>c.op==='line'&&c.color==='#ff0000')).toEqual(Array(2).fill([{op:'line',from:{x:400,y:-155},to:{x:612,y:-155},color:'#ff0000',width:0},{op:'line',from:{x:612,y:-125},to:{x:612,y:-155},color:'#ff0000',width:0}]).flat());
  expect(state.values.DesTemp).toBe(100);expect(state.values.AnyInt).toBe(1.5);
});
test('catalog template build consumes exact bytes against prior color and sparse navigation memory',async()=>{
  const catalog=await loadCatalog(resolve('private/catalog'));
  const template=catalog.template('gpas/GPAS3.dxf');expect(Object.isFrozen(template.records)).toBe(true);
  const state=createInitialState(culture);state.routeId='Gpas3';Object.assign(state.values,{MainSize:1,DrawDatum:1030});
  state.legacyBuffers=parseLegacyDrawing(bytes('4'),fresh()).buffers;
  buildDisplayList(state,template,catalog,{width:1067,height:690});
  expect(state.legacyBuffers.lineMem[1][6]).toBe('7'); // initial raw92 inherits previous gray
  expect(state.legacyBuffers.drawing?.lc).toBe(template.records.length+1);
  const marker=template.records.find(r=>r.sourceRefs[0].line===7510)!;
  expect(markerFor(marker)).toEqual({bank:1,column:26,raw:false});
  const pipe=catalog.template('Pipe/pipe1a.dxf').records.find(r=>r.sourceRefs[0].line===8830)!;
  expect(markerFor(pipe)).toEqual({bank:1,column:4,raw:false});
});
test('drawing state is versioned and a relabeled old schema cannot silently drop scratch state',()=>{
  const {state}=setup(),encoded=encodeWorkState(state);expect(encoded.stateSchemaVersion).toBe(3);
  expect(()=>decodeWorkState({...encoded,stateSchemaVersion:2})).toThrow('Invalid private work state');
  for(const field of ['sc','lc','colr','factor']){
    const bad=structuredClone(state);bad.legacyBuffers.drawing![field as 'sc']=NaN;
    expect(()=>encodeWorkState(bad)).toThrow('Invalid private work state');
  }
});
test('source equality aspect ratio retains prior Factor rather than fitting bounds',()=>{
  const {state,template}=setup('4');state.legacyBuffers.drawing!.factor=2;
  expect(buildDisplayList(state,template,dummy,{width:10000,height:6466}).transform).toEqual([Math.fround(1.2),0,0,Math.fround(1.2),3934,2743]);
});
test('raw non-Flan labels center and numeric Span masks retain both source rectangles',()=>{
  const a=setup('2');a.state.routeId='Pipe1';a.state.legacyBuffers.activeDba[1][1][4]=' 90* ';
  expect(buildDisplayList(a.state,a.template,dummy,{width:1067,height:690}).commands.slice(0,2)).toEqual([{op:'fillRect',x:Math.fround(10-54*.65),y:70,width:Math.fround(54*1.3),height:30,color:'#ffffff'},{op:'text',text:'90°',x:10,y:72,font:'bold 16pt Verdana',align:'center',color:'#062134'}]);
  const b=setup();b.state.routeId='Span1';expect(buildDisplayList(b.state,b.template,dummy,{width:1067,height:690}).commands.slice(0,2)).toEqual([{op:'fillRect',x:-70,y:70,width:160,height:30,color:'#ffffff'},{op:'fillRect',x:-50,y:70,width:120,height:30,color:'#ffffff'}]);
});
test('lc inclusive paints uncleared line1001 after a later 1000-record drawing, including codec resume',()=>{
  const {state}=setup('3');state.legacyBuffers.lineMem[1001]={2:'42',3:'20',4:'43',5:'30',6:'7'};
  const tail=[...Buffer.from(bytes()).toString().split(/\r\n/).slice(26),'pad','pad'];
  const raw=Buffer.from([...Array(26).fill('header'),...Array(1000).fill(tail).flat()].join('\n'));
  const restored=decodeWorkState(encodeWorkState(state));
  const lists=[state,restored].map(s=>{s.legacyBuffers=parseLegacyDrawing(raw,s.legacyBuffers).buffers;return buildDisplayList(s,{id:'sequence',sourceHash:'test',records:[]},dummy,{width:1067,height:690});});
  expect(lists[0].commands).toHaveLength(1001);expect(lists[1]).toEqual(lists[0]);
  expect(lists[0].commands.at(-1)).toEqual({op:'line',from:{x:42,y:80},to:{x:43,y:70},color:'#c0c0c0',width:1});
});
test('source lineMem upper-bound one-past read errors rather than fabricating a blank segment',()=>{
  const {state,template}=setup();state.legacyBuffers.drawing!.lc=10001;
  expect(()=>buildDisplayList(state,template,dummy,{width:1067,height:690})).toThrow('Drawing line index');
});
test('unknown raw color is matched as text without introducing VB numeric overflow',()=>{
  const prior=parseLegacyDrawing(bytes('4'),fresh()).buffers;
  const raw='9'.repeat(400),parsed=parseLegacyDrawing(bytes(raw),prior);
  expect(parsed.records[0]).toMatchObject({internalColor:7,rawColor:null,rawColorToken:raw,inheritedColorRule:'previous-line'});
});
test.each(temperature.cases)('Framework Single restoration changes subsequent Ptem crosshair: $raw',c=>{
  const {state,template}=setup('3');state.routeId='Ptem1';Object.assign(state.values,{DesTemp:c.initial,TempSign:'F',DesignPressure:20,ASMEClass:'150#'});
  const list=buildDisplayList(state,template,dummy,{width:1067,height:690});
  const x=list.commands.filter(v=>v.op==='line'&&v.color==='#ff0000').map(v=>v.op==='line'?v.to.x:NaN);
  expect(x).toEqual(c.crosshairX.flatMap(n=>[n,n]));expect(state.values.DesTemp).toBe(c.restored);
});
test('source parser error retains sequentially assigned row fields and leaves caller untouched',()=>{
  const prior=fresh(),raw=Buffer.from(Buffer.from(bytes()).toString().replace('11\r\n14','11\r\n1e400'));
  try{parseLegacyDrawing(raw,prior);expect.fail('Expected original VB Val overflow');}
  catch(error){expect(error).toBeInstanceOf(DrawingProtocolError);const failure=error as DrawingProtocolError;
    expect(failure.stage).toBe('Drawlines1');expect(failure.buffers.lineMem[1]).toMatchObject({1:null,2:'10',3:'20',4:'',5:'',6:''});
    expect(prior.lineMem).toEqual({});
  }
});
test.each(temperature.trimCases)('raw bank labels use Framework VB Trim codepoint $code',c=>{
  const {state,template}=setup('2');state.legacyBuffers.activeDba[1][1][4]=c.raw;
  expect(buildDisplayList(state,template,dummy,{width:1067,height:690}).commands[1]).toMatchObject({text:c.expected});
});
test('fixed token matching preserves tabs and NBSP which VB Trim does not remove',()=>{
  expect(parseLegacyDrawing(bytes('3','10','14','\tAcDbLine\t'),fresh()).records).toHaveLength(0);
  expect(parseLegacyDrawing(bytes('\u00a05\u00a0'),fresh()).records[0].internalColor).toBe(0);
});
