import { expect,test } from 'vitest';
import { renderCanvas,canvasFont } from '../../src/workspace/render-canvas';
test('Canvas applies DPR to backing pixels/transform, preserves command order and point font units',()=>{
  const calls:unknown[][]=[],ctx=new Proxy({canvas:{width:0,height:0,style:{}}},{get(target,key){if(key in target)return target[key as keyof typeof target];return (...args:unknown[])=>calls.push([key,...args]);},set(target,key,value){calls.push(['set',key,value]);return Reflect.set(target,key,value);}}) as unknown as CanvasRenderingContext2D;
  const list={width:100,height:50,transform:[.6,0,0,.6,2,3],commands:[{op:'fillRect' as const,x:1,y:2,width:30,height:4,color:'white'},{op:'text' as const,text:'N/A',x:5,y:6,font:'bold 16pt Verdana',align:'center' as const,color:'navy'},{op:'line' as const,from:{x:0,y:1},to:{x:2,y:3},width:0,color:'red'}]};
  renderCanvas(ctx,list,2);expect(ctx.canvas.width).toBe(200);expect(ctx.canvas.height).toBe(100);
  expect(calls).toContainEqual(['setTransform',1.2,0,0,1.2,4,6]);expect(calls).toContainEqual(['set','font','bold 21.333333333333332px Verdana']);expect(calls).toContainEqual(['set','textBaseline','top']);
  expect(calls.filter(c=>['fillRect','fillText','moveTo','lineTo'].includes(String(c[0])))).toEqual([['fillRect',0,0,100,50],['fillRect',1,2,30,4],['fillText','N/A',5,6],['moveTo',0,1],['lineTo',2,3]]);
  expect(calls).toContainEqual(['set','lineWidth',1/1.2]);
  expect(()=>renderCanvas(ctx,list,0)).toThrow('Invalid canvas scale');
});
test('Point fonts convert at logical96dpi while Pixel fonts retain source size',()=>{
  expect(canvasFont('bold 9pt Tahoma')).toBe('bold 12px Tahoma');
  expect(canvasFont('16px Verdana')).toBe('16px Verdana');
});

test.each([{width:320,height:180,transform:[2,0,0,2,40,30]}, {width:800,height:600,transform:[4,0,0,4,100,70]}])('presentation replays exact source commands once at $width pixels',presentation=>{
  const calls:unknown[][]=[];
  const ctx=new Proxy({canvas:{width:0,height:0,style:{}}},{get(target,key){if(key in target)return target[key as keyof typeof target];return (...args:unknown[])=>calls.push([key,...args]);},set(target,key,value){calls.push(['set',key,value]);return Reflect.set(target,key,value);}}) as unknown as CanvasRenderingContext2D;
  const drawing={width:100,height:50,transform:[.6,0,0,.6,2,3],commands:[
    {op:'line' as const,from:{x:-12,y:3},to:{x:27,y:40},width:0,color:'red'},
    {op:'fillRect' as const,x:-3,y:8,width:15,height:12,color:'white'},
    {op:'text' as const,text:'Ø 1½″ / 45°',x:12,y:20,font:'9pt Tahoma',align:'right' as const,verticalAlign:'bottom' as const,color:'black'},
  ]};
  const original=structuredClone(drawing);
  renderCanvas(ctx,drawing,2,presentation);
  expect(ctx.canvas.width).toBe(presentation.width*2);
  expect(ctx.canvas.height).toBe(presentation.height*2);
  expect(ctx.canvas.style).toEqual({width:presentation.width+'px',height:presentation.height+'px'});
  expect(calls.filter(c=>['fillRect','fillText','moveTo','lineTo'].includes(String(c[0])))).toEqual([
    ['fillRect',0,0,presentation.width,presentation.height],['moveTo',-12,3],['lineTo',27,40],['fillRect',-3,8,15,12],['fillText','Ø 1½″ / 45°',12,20],
  ]);
  expect(calls).toContainEqual(['setTransform',...presentation.transform.map(n=>n*2)]);
  expect(calls).toContainEqual(['set','lineWidth',1/(2*presentation.transform[0])]);
  expect(calls).toContainEqual(['set','textAlign','right']);
  expect(calls).toContainEqual(['set','textBaseline','bottom']);
  expect(drawing).toEqual(original);
});

test('empty presentation resets backing pixels and rejects invalid dimensions/transforms',()=>{
  const calls:unknown[][]=[];
  const ctx=new Proxy({canvas:{width:100,height:100,style:{}}},{get(target,key){if(key in target)return target[key as keyof typeof target];return (...args:unknown[])=>calls.push([key,...args]);}}) as unknown as CanvasRenderingContext2D;
  const drawing={width:100,height:100,transform:[1,0,0,1,0,0],commands:[]};
  renderCanvas(ctx,drawing,1,{width:200,height:80,transform:[1,0,0,1,0,0]});
  expect(calls).toContainEqual(['fillRect',0,0,200,80]);
  expect(()=>renderCanvas(ctx,drawing,1,{width:NaN,height:80,transform:drawing.transform})).toThrow();
  expect(()=>renderCanvas(ctx,drawing,1,{width:200,height:80,transform:[1,0,0,1,Infinity,0]})).toThrow();
});
