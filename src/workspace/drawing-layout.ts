import type { PublicDrawing } from '../shared/public-contracts';
import { canvasFont } from './render-canvas';

export type DrawingBounds = { left: number; top: number; right: number; bottom: number };
export const maximumDrawingZoom = 16;
export type DrawingDetail = {zoom:number;focus:{x:number;y:number};requiresPan?:boolean};

function minimumNumericFont(drawing:PublicDrawing):number|null {
  const sizes=drawing.commands.flatMap(command=>command.op==='text'&&/\d/.test(command.text)
    ?[Number(canvasFont(command.font).match(/([\d.]+)px\b/)?.[1])]:[]).filter(size=>Number.isFinite(size)&&size>0);
  return sizes.length?Math.min(...sizes):null;
}

export function resolveDrawingFocus(ctx:CanvasRenderingContext2D,drawing:PublicDrawing,indices:number[]|undefined):{bounds:DrawingBounds;minimumLabelPx:number|null}|null {
  if(!indices?.length||indices.length>drawing.commands.length||new Set(indices).size!==indices.length
    ||indices.some(i=>!Number.isSafeInteger(i)||i<0||i>=drawing.commands.length))return null;
  const selected={...drawing,commands:indices.map(i=>drawing.commands[i])};
  const bounds=measureDrawingBounds(ctx,selected);
  return bounds?{bounds,minimumLabelPx:minimumNumericFont(selected)}:null;
}

export function drawingDetail(drawing:PublicDrawing,transform:number[],bounds?:DrawingBounds,size?:{width:number;height:number}):DrawingDetail|null {
  const labels=drawing.commands.flatMap(command=>command.op==='text'&&/\d/.test(command.text)?[command]:[]);
  const minimum=minimumNumericFont(drawing);
  if(!minimum||!labels.length)return null;
  const [a,b,c,d,e,f]=transform,scale=Math.hypot(a,b);
  const x=bounds?(bounds.left+bounds.right)/2:(Math.min(...labels.map(l=>l.x))+Math.max(...labels.map(l=>l.x)))/2;
  const y=bounds?(bounds.top+bounds.bottom)/2:(Math.min(...labels.map(l=>l.y))+Math.max(...labels.map(l=>l.y)))/2;
  const zoom=Math.min(maximumDrawingZoom,Math.max(1,12/(minimum*scale)));
  return {zoom,focus:{x:x*a+y*c+e,y:x*b+y*d+f},...(bounds&&size?{requiresPan:
    (bounds.right-bounds.left)*scale*zoom>size.width||(bounds.bottom-bounds.top)*scale*zoom>size.height}:{} )};
}

export function measureDrawingBounds(ctx: CanvasRenderingContext2D, drawing: PublicDrawing): DrawingBounds | null {
  let bounds: DrawingBounds | null = null;
  function include(left: number, top: number, right: number, bottom: number) {
    if (!bounds) bounds = { left, top, right, bottom };
    else {
      bounds.left = Math.min(bounds.left, left);
      bounds.top = Math.min(bounds.top, top);
      bounds.right = Math.max(bounds.right, right);
      bounds.bottom = Math.max(bounds.bottom, bottom);
    }
  }

  ctx.save();
  try {
    for (const command of drawing.commands) {
      if (command.op === 'line') {
        // Hairlines are one device pixel wide. fitDrawing reserves their
        // half-pixel radius in output space, independently of source scale.
        const radius = Math.abs(command.width) / 2;
        include(
          Math.min(command.from.x, command.to.x) - radius,
          Math.min(command.from.y, command.to.y) - radius,
          Math.max(command.from.x, command.to.x) + radius,
          Math.max(command.from.y, command.to.y) + radius,
        );
      } else if (command.op === 'fillRect') {
        include(
          Math.min(command.x, command.x + command.width),
          Math.min(command.y, command.y + command.height),
          Math.max(command.x, command.x + command.width),
          Math.max(command.y, command.y + command.height),
        );
      } else {
        ctx.font = canvasFont(command.font);
        ctx.textAlign = command.align;
        ctx.textBaseline = command.verticalAlign === 'bottom' ? 'bottom' : 'top';
        const metrics = ctx.measureText(command.text);
        const fontSize = Number(ctx.font.match(/([\d.]+)px\b/)?.[1]);
        if (!Number.isFinite(metrics.width) || metrics.width < 0 || !Number.isFinite(fontSize) || fontSize <= 0) {
          throw new Error('Invalid drawing text metrics');
        }
        const advanceLeft = command.align === 'right' ? command.x - metrics.width
          : command.align === 'center' ? command.x - metrics.width / 2 : command.x;
        const advanceRight = advanceLeft + metrics.width;
        // TextMetrics ink extents already include the configured alignment and
        // baseline. Retain negative ascent/descent and asymmetric overhangs.
        const left = Number.isFinite(metrics.actualBoundingBoxLeft)
          ? command.x - metrics.actualBoundingBoxLeft : advanceLeft - fontSize / 2;
        const right = Number.isFinite(metrics.actualBoundingBoxRight)
          ? command.x + metrics.actualBoundingBoxRight : advanceRight + fontSize / 2;
        const top = Number.isFinite(metrics.actualBoundingBoxAscent)
          ? command.y - metrics.actualBoundingBoxAscent
          : command.y - fontSize * (ctx.textBaseline === 'bottom' ? 1.5 : .5);
        const bottom = Number.isFinite(metrics.actualBoundingBoxDescent)
          ? command.y + metrics.actualBoundingBoxDescent
          : command.y + fontSize * (ctx.textBaseline === 'bottom' ? .5 : 1.5);
        include(Math.min(left, advanceLeft), top, Math.max(right, advanceRight), bottom);
      }
    }
  } finally {
    ctx.restore();
  }
  return bounds;
}

export function fitDrawing(
  drawing: PublicDrawing,
  bounds: DrawingBounds | null,
  size: { width: number; height: number },
  padding: number,
): PublicDrawing {
  const { width, height } = size;
  const hasHairlines = drawing.commands.some(command => command.op === 'line' && command.width === 0);
  const inset = hasHairlines ? Math.max(padding, .5) : padding;
  if (![width, height, padding].every(Number.isFinite) || padding < 0 || width <= 2 * inset || height <= 2 * inset) {
    throw new Error('Invalid drawing viewport');
  }
  if (!bounds) return { ...drawing, width, height, transform: [1, 0, 0, 1, 0, 0] };

  const boundsWidth = bounds.right - bounds.left;
  const boundsHeight = bounds.bottom - bounds.top;
  if (![bounds.left, bounds.top, bounds.right, bounds.bottom, boundsWidth, boundsHeight].every(Number.isFinite)
    || boundsWidth < 0 || boundsHeight < 0) {
    throw new Error('Invalid drawing bounds');
  }
  const scaleX = boundsWidth > 0 ? (width - 2 * inset) / boundsWidth : Infinity;
  const scaleY = boundsHeight > 0 ? (height - 2 * inset) / boundsHeight : Infinity;
  const scale = boundsWidth === 0 && boundsHeight === 0 ? 1 : Math.min(scaleX, scaleY);
  const transform = [scale, 0, 0, scale,
    width / 2 - (bounds.left + boundsWidth / 2) * scale,
    height / 2 - (bounds.top + boundsHeight / 2) * scale];
  if (scale <= 0 || !transform.every(Number.isFinite)) throw new Error('Invalid drawing transform');
  return { ...drawing, width, height, transform };
}
