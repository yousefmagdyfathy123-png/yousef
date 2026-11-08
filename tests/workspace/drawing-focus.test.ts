import {expect,test} from 'vitest';
import {resolveDrawingFocus,drawingDetail,fitDrawing} from '../../src/workspace/drawing-layout';
import type {PublicDrawing} from '../../src/shared/public-contracts';

const drawing:PublicDrawing={width:100,height:100,transform:[1,0,0,1,0,0],commands:[
  {op:'line',from:{x:100,y:100},to:{x:300,y:200},width:2,color:'navy'},
  {op:'fillRect',x:90,y:80,width:100,height:20,color:'white'},
  {op:'text',x:150,y:90,text:'25',font:'10px serif',align:'left',color:'navy'},
  {op:'line',from:{x:2000,y:100},to:{x:2400,y:400},width:2,color:'navy'},
]};
function context(width=20){return {save(){},restore(){},font:'',textAlign:'left',textBaseline:'top',
  measureText(){return {width,actualBoundingBoxLeft:0,actualBoundingBoxRight:width,actualBoundingBoxAscent:8,actualBoundingBoxDescent:2};},
} as unknown as CanvasRenderingContext2D;}

test('verified focus includes geometry masks and dimensions but not the distant view',()=>{
  expect(resolveDrawingFocus).toBeTypeOf('function');
  const before=structuredClone(drawing),focus=resolveDrawingFocus(context(),drawing,[0,1,2]);
  expect(focus).toEqual({bounds:{left:90,top:80,right:301,bottom:201},minimumLabelPx:10});
  const fit=fitDrawing(drawing,focus!.bounds,{width:480,height:300},24);
  expect(fit.commands).toBe(drawing.commands);
  expect(195.5*fit.transform[0]+fit.transform[4]).toBeCloseTo(240);
  expect(140.5*fit.transform[3]+fit.transform[5]).toBeCloseTo(150);
  expect(drawing).toEqual(before);
});

test('missing duplicate out-of-range or empty focus metadata cannot guess a primary view',()=>{
  expect(resolveDrawingFocus).toBeTypeOf('function');
  for(const indices of [undefined,[],[0,0],[-1],[1.1],[4],[NaN]])expect(resolveDrawingFocus(context(),drawing,indices)).toBeNull();
  expect(resolveDrawingFocus(context(),{...drawing,commands:[]},[0])).toBeNull();
});

test('detail centers the full dimension group instead of the first numeric label',()=>{
  const bounds={left:90,top:80,right:301,bottom:201};
  const detail=drawingDetail(drawing,[.1,0,0,.1,5,7],bounds,{width:480,height:300});
  expect(detail?.focus.x).toBeCloseTo(24.55);
  expect(detail?.focus.y).toBeCloseTo(21.05);
  expect(detail?.zoom).toBeCloseTo(12);
  expect(detail?.requiresPan).toBe(false);
});

test('readable detail is bounded and explains panning when the full group cannot fit',()=>{
  const detail=drawingDetail(drawing,[.02,0,0,.02,0,0],{left:0,top:0,right:2400,bottom:400},{width:390,height:240});
  expect(detail?.zoom).toBe(16);
  expect(detail?.requiresPan).toBe(true);
  expect(drawingDetail({...drawing,commands:[drawing.commands[0]]},[1,0,0,1,0,0])).toBeNull();
});

test('new font metrics recompute focused bounds without changing the source',()=>{
  const textOnly={...drawing,commands:[drawing.commands[2]]};
  expect(resolveDrawingFocus).toBeTypeOf('function');
  expect(resolveDrawingFocus(context(20),textOnly,[0])!.bounds.right).toBe(170);
  expect(resolveDrawingFocus(context(80),textOnly,[0])!.bounds.right).toBe(230);
});
