import type { PublicLegacyView } from '../shared/public-contracts';
// Source GraphicsUnit.Point converts at96 logical DPI, before DPR/viewport transforms.
export function canvasFont(font:string):string{return font.replace(/([\d.]+)pt\b/g,(_,size:string)=>`${Number(size)*96/72}px`);}
export type CanvasPresentation = {width:number;height:number;transform:number[]};
export function renderCanvas(ctx:CanvasRenderingContext2D,list:PublicLegacyView['drawing'],dpr:number,presentation?:CanvasPresentation):void{
  if(!Number.isFinite(dpr)||dpr<=0)throw new Error('Invalid canvas scale');
  const {width,height,transform}=presentation??list;
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||transform.length!==6||!transform.every(Number.isFinite))throw new Error('Invalid canvas presentation');
  ctx.canvas.width=Math.round(width*dpr);ctx.canvas.height=Math.round(height*dpr);
  ctx.canvas.style.width=width+'px';ctx.canvas.style.height=height+'px';
  ctx.save();
  try{
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);
    const [a,b,c,d,e,f]=transform;ctx.setTransform(a*dpr,b*dpr,c*dpr,d*dpr,e*dpr,f*dpr);
    for(const command of list.commands){
      if(command.op==='fillRect'){ctx.fillStyle=command.color;ctx.fillRect(command.x,command.y,command.width,command.height);}
      else if(command.op==='text'){ctx.fillStyle=command.color;ctx.font=canvasFont(command.font);ctx.textAlign=command.align;ctx.textBaseline=command.verticalAlign==='bottom'?'bottom':'top';ctx.fillText(command.text,command.x,command.y);}
      else{ctx.strokeStyle=command.color;ctx.lineWidth=command.width===0?1/(dpr*Math.max(Math.hypot(a,b),Math.hypot(c,d),Number.EPSILON)):command.width;ctx.beginPath();ctx.moveTo(command.from.x,command.from.y);ctx.lineTo(command.to.x,command.to.y);ctx.stroke();}
    }
  }finally{ctx.restore();}
}
