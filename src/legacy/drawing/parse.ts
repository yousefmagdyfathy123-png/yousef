import type { DrawingBuffers, LegacyBuffers, LegacyLine } from '../contracts';
import { sourceLines } from '../catalog/parse';
import { sha256 } from '../catalog/integrity';
import { vbRound, vbVal } from '../vb/numbers';
import { vbString, vbTrim } from '../vb/strings';
const culture = {name:'en-US',decimalSeparator:'.',groupSeparator:','};
const colors:Record<string,number>={'131':3,'30':30,'10':12,'1':4,'2':6,'3':0,'4':7,'5':1,'6':99,'7':9};
export type ParsedDrawing = { buffers: LegacyBuffers; records: LegacyLine[] };
// Carries the partially modified clone for the route's ErrorCatch boundary.
export class DrawingProtocolError extends Error {
  constructor(public stage:'LoadDrawing'|'Drawlines1',public buffers:LegacyBuffers,public cause:unknown){super(`Drawing protocol error: ${stage}`);}
}
export function emptyDrawingBuffers():DrawingBuffers{return {lineVar2:{},c:0,colr:0,linetype:0,sc:1,lc:1,factor:0};}
export function parseLegacyDrawing(bytes: Uint8Array, prior: LegacyBuffers): ParsedDrawing {
  const buffers=structuredClone(prior), d=buffers.drawing??=emptyDrawingBuffers();
  const records:LegacyLine[]=[], origins:Record<number,number>={};
  const sourceHash=sha256(bytes);
  const token=(i:number):string|null=>{
    if(i<0||i>200000)throw new RangeError('Drawing token index');
    return d.lineVar2[i]??null;
  };
  try {
    d.sc=1;for(let i=1;i<=20000;i++)d.lineVar2[i]='';
    let xx=1;
    for(const text of sourceLines(bytes)){
      if(text==='AcDbEntity')d.c=xx;
      if(xx>26&&xx>d.c-1&&xx-d.c<25){
        if(d.sc>200000)throw new RangeError('Drawing token index');
        d.lineVar2[d.sc]=text;origins[d.sc]=xx;d.sc++;
      }
      xx++;
    }
  }catch(error){throw new DrawingProtocolError('LoadDrawing',buffers,error);}
  try {
    for(let row=1;row<=1000;row++){
      const cells=buffers.lineMem[row]??={};for(let col=1;col<=10;col++)cells[col]='';
    }
    d.lc=1;
    for(let i=1;i<=d.sc;i++){
      if(vbTrim(token(i))!=='AcDbEntity'||vbTrim(token(i+8))!=='AcDbLine')continue;
      const lt=token(i+4);
      if(lt==='Continuous')d.linetype=0;
      if(lt==='ACAD_ISO04W100')d.linetype=3;
      if(lt==='DASHED')d.linetype=2;
      const raw=vbTrim(token(i+6)), explicit=Object.hasOwn(colors,raw);
      if(explicit)d.colr=colors[raw];
      if(d.lc>10000)throw new RangeError('Drawing line index');
      const cells=buffers.lineMem[d.lc]??={};
      cells[1]=token(d.linetype);
      const coords:number[]=[];
      for(const [index,off] of [10,12,16,18].entries()){
        const n=vbRound(vbVal(token(i+off))*1000,0)/1000;
        cells[index+2]=vbString(n,culture);coords.push(n);
      }
      cells[6]=String(d.colr);cells[7]=vbString(vbVal(token(i+2)),culture);
      const numericColor=/^[+-]?\d+$/.test(raw)&&Number.isFinite(Number(raw))?Number(raw):null;
      records.push({sourceId:sourceHash,sourceRefs:[{path:'template-source',hash:sourceHash,...(origins[i]===undefined?{}:{line:origins[i]})}],tokenOffsets:{start:i,end:i+18},from:{x:coords[0],y:coords[1]},to:{x:coords[2],y:coords[3]},rawColor:numericColor,rawColorToken:token(i+6)??'',internalColor:d.colr,layer:vbVal(token(i+2)),inheritedColorRule:explicit?'explicit':'previous-line'});
      d.lc++;
    }
  }catch(error){throw new DrawingProtocolError('Drawlines1',buffers,error);}
  return {buffers,records};
}
