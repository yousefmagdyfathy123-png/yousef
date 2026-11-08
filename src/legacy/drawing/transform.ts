import type { WorkState } from '../contracts';
import { emptyDrawingBuffers } from './parse';
// Shared verbatim arithmetic in source WhiteBlock and DoDrawing. This is
// logical display state, including the equality case that retains prior Factor.
export function drawingTransform(state:WorkState,viewport:{width:number;height:number}):number[]{
  const {width,height}=viewport;
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('Invalid drawing viewport');
  const d=state.legacyBuffers.drawing??=emptyDrawingBuffers(),ratio=height/width;
  if(ratio>.6466)d.factor=width/1067;
  if(ratio<.6466)d.factor=height/690;
  const scale=Math.fround(.6*d.factor);
  return [scale,0,0,scale,Math.fround(width/2-533*d.factor),Math.fround(10+height/2-250*d.factor)];
}
