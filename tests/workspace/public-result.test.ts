import { expect,test,vi } from 'vitest';
vi.mock('server-only',()=>({}));
import { toPublicWorkResult } from '../../src/server/engineering/public-result';
import { parsePublicWorkResult } from '../../src/shared/public-schemas';
import type { WorkResult } from '../../src/legacy/contracts';
import { loadFlangeCases } from '../reference/flange-cases';
import { createInitialState } from '../../src/legacy/state/initial';
const original=loadFlangeCases('Flan1')[0].expected.view;
function input():WorkResult{return {state:{revision:9} as WorkResult['state'],view:structuredClone(original) as WorkResult['view'],trace:[],evidenceIds:[]};}
test('maps source view field by field and excludes private root/nested data',()=>{
  const source=input(),secret='PRIVATE-DATA-DO-NOT-LEAK';
  for(const o of [source,source.view,source.view.controls[0],source.view.controls[0].layout,source.view.controls[0].options[0],source.view.drawing,source.view.drawing.commands[0],source.view.textResults!,source.view.textResults!.rows[0]])Object.assign(o,{secret,sourcePath:secret,rawBuffers:secret});
  const dto=toPublicWorkResult('opaque-workspace',source);expect(JSON.stringify(dto)).not.toContain(secret);expect(JSON.stringify(dto)).not.toContain('sourceRefs');
  expect(dto.revision).toBe(9);expect(dto.workspaceId).toBe('opaque-workspace');
  for(let i=0;i<original.controls.length;i++){expect(dto.view.controls[i].layout).toEqual(original.controls[i].layout);expect(dto.view.controls[i].options).toEqual(original.controls[i].options);}
  expect(dto.view.headers).toEqual(original.headers);expect(dto.view.drawing).toEqual(original.drawing);expect(dto.view.textResults).toEqual(original.textResults);
  expect(parsePublicWorkResult(dto)).toEqual(dto);
});
test('strict public schema rejects extra fields at every nested object and sanitizes errors',()=>{
  const dto=toPublicWorkResult('workspace',input());
  const lineIndex=dto.view.drawing.commands.findIndex(c=>c.op==='line');
  for(const path of [[],['view'],['view','visibility'],['view','controls',0],['view','controls',0,'layout'],['view','controls',0,'options',0],['view','drawing'],['view','drawing','commands',0],['view','drawing','commands',lineIndex,'from'],['view','textResults'],['view','textResults','rows',0]]){
    const bad=structuredClone(dto);let at:unknown=bad;for(const key of path)at=(at as Record<string,unknown>)[key];
    Object.assign(at as object,{PRIVATE_SECRET:'source/catalog/private'});
    expect(()=>parsePublicWorkResult(bad)).toThrow('Invalid public work result');
    try{parsePublicWorkResult(bad);}catch(e){expect(String(e)).not.toContain('source/catalog/private');}
  }
  const bad=structuredClone(dto);bad.view.drawing.transform[0]=NaN;expect(()=>parsePublicWorkResult(bad)).toThrow('Invalid public work result');
});
test('strict public arrays reject balanced holes and extra metadata keys',()=>{
  const dto=toPublicWorkResult('workspace',input());
  const array=dto.view.headers as string[]&{privateMetadata?:string};
  delete array[0];array.privateMetadata='PRIVATE-DATA';
  expect(()=>parsePublicWorkResult(dto)).toThrow('Invalid public work result');
});

test('public menu/dialog action projection excludes private markers and every nested object is strict',()=>{
  const result=input();result.state=createInitialState({name:'en-US',decimalSeparator:'.',groupSeparator:','});
  result.state.legacySession!.lastView=result.view;
  Object.assign(result.state,{sourcePath:'PRIVATE-PATH',rawBuffers:'PRIVATE-BUFFER'});
  Object.assign(result.view.controls[0],{sourcePath:'PRIVATE-CONTROL'});
  const dto=toPublicWorkResult('workspace',result);
  expect(dto.ui?.items.length).toBeGreaterThan(100);expect(JSON.stringify(dto)).not.toMatch(/PRIVATE-|sourceRefs|sourcePath|rawBuffers/);
  function paths(v:unknown,path:(string|number)[]=[]):(string|number)[][]{
    if(!v||typeof v!=='object')return [];
    return [...(!Array.isArray(v)?[path]:[]),...Object.entries(v).flatMap(([key,value])=>paths(value,[...path,key]))];
  }
  for(const path of paths(dto.ui,['ui'])){
    const bad=structuredClone(dto);let at:unknown=bad;for(const key of path)at=(at as Record<string,unknown>)[key];
    Object.assign(at as object,{secret:'PRIVATE-ERROR'});
    expect(()=>parsePublicWorkResult(bad)).toThrow('Invalid public work result');
  }
},60000);

test('strict object schemas reject symbol and nonenumerable metadata as well as JSON extras',()=>{
  for(const key of ['secret',Symbol('secret')]){
    const dto=toPublicWorkResult('workspace',input());Object.defineProperty(dto.view.controls[0].layout,key,{value:'PRIVATE',enumerable:false});
    expect(()=>parsePublicWorkResult(dto)).toThrow('Invalid public work result');
  }
});
test('invalid internal output reports a sanitized contract error before any response or receipt',()=>{
  const result=input();Object.defineProperty(result.view,'headers',{get(){throw new Error('PRIVATE-CATALOG-PATH');}});
  expect(()=>toPublicWorkResult('workspace',result)).toThrow('Invalid public work result');
});

test('optional presentation metadata is accepted without changing legacy DTOs',()=>{
  const dto=toPublicWorkResult('workspace',input());
  expect(parsePublicWorkResult(dto)).toEqual(dto);
  const enriched={...dto,view:{...dto.view,presentation:{primaryCommandIndices:[0,1]}}};
  expect(parsePublicWorkResult(enriched).view.presentation).toEqual({primaryCommandIndices:[0,1]});
});

test('presentation rejects malformed indices and private metadata at the boundary',()=>{
  const dto=toPublicWorkResult('workspace',input());
  for(const indices of [[],[0,0],[-1],[0.5],[NaN],[Infinity],[dto.view.drawing.commands.length]]){
    const bad={...dto,view:{...dto.view,presentation:{primaryCommandIndices:indices}}};
    expect(()=>parsePublicWorkResult(bad)).toThrow('Invalid public work result');
  }
  for(const presentation of [{primaryCommandIndices:[0],sourcePath:'PRIVATE'}, {primaryCommandIndices:[0],bounds:{x:0}}]){
    expect(()=>parsePublicWorkResult({...dto,view:{...dto.view,presentation}})).toThrow('Invalid public work result');
  }
});

test('result row roles survive public projection and strict private/public validation',async()=>{
  const {validateLegacyView}=await import('../../src/legacy/state/view-schema');
  const source=input();source.view.textResults={status:'available',rows:[
    {id:'a',label:'Ambient Temp:',value:'20',unit:'°C',kind:'input'},
    {id:'b',label:'Required distance to first guide',value:'1639',unit:'mm',kind:'output'},
    {id:'legacy',label:'Length',value:'10',unit:'mm'},
  ]};
  expect(()=>validateLegacyView(source.view)).not.toThrow();
  const dto=toPublicWorkResult('roles',source);
  expect(parsePublicWorkResult(dto).view.textResults).toEqual(source.view.textResults);
  for(const kind of ['secret',null,3]){
    const bad=structuredClone(dto);Object.assign(bad.view.textResults!.rows[0],{kind});
    expect(()=>parsePublicWorkResult(bad)).toThrow('Invalid public work result');
    const privateBad=structuredClone(source.view);Object.assign(privateBad.textResults!.rows[0],{kind});
    expect(()=>validateLegacyView(privateBad)).toThrow('Invalid private legacy view');
  }
});
