import {test,expect} from 'vitest';
import {drawingDetail} from '../../src/workspace/drawing-layout';
import type {PublicDrawing} from '../../src/shared/public-contracts';

test('detail view makes small dimensions readable and focuses an actual dimension',()=>{
  const drawing:PublicDrawing={width:100,height:100,transform:[1,0,0,1,0,0],commands:[
    {op:'text',x:200,y:100,text:'318',font:'bold 16pt Verdana',align:'center',color:'navy'},
  ]};
  const result=drawingDetail(drawing,[.06,0,0,.06,20,60]);
  if(!result)throw new Error('Expected a dimension focus');
  expect(result.zoom).toBeCloseTo(9.375);
  expect(result.focus).toEqual({x:32,y:66});
  expect(result.zoom*.06*(16*96/72)).toBeCloseTo(12);
});

test('detail view stays bounded for empty drawings and microscopic source fonts',()=>{
  const drawing:PublicDrawing={width:100,height:100,transform:[1,0,0,1,0,0],commands:[]};
  expect(drawingDetail(drawing,[1,0,0,1,50,50])).toBeNull();
  drawing.commands.push({op:'text',x:0,y:0,text:'1',font:'1px serif',align:'left',color:'navy'});
  expect(drawingDetail(drawing,[.01,0,0,.01,20,20])?.zoom).toBe(16);
});
