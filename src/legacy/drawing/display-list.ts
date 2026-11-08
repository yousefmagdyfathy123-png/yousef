import type { WorkState, LegacyTemplate, Catalog, DisplayList, LegacyLine, DrawCommand } from '../contracts';
import { parseLegacyDrawing } from './parse';
import { drawingTransform } from './transform';
import { markerFor, markerText } from './markers';
import { vbDouble, vbRound, vbVal } from '../vb/numbers';
import { vbTrim } from '../vb/strings';
const f=Math.fround;
// VB Single operations round after each operation, including intermediate Y*2.
const flip=(y:number,datum:number)=>f(f(f(y)-f(f(y)*2))+f(datum));
function lineRecord(state:WorkState,row:number):LegacyLine {
  if(row<0||row>10000)throw new RangeError('Drawing line index');
  const cells=state.legacyBuffers.lineMem[row]??{};
  return {sourceId:'lineMem',sourceRefs:[],tokenOffsets:{start:0,end:0},from:{x:f(vbVal(cells[2]??null)),y:f(vbVal(cells[3]??null))},to:{x:f(vbVal(cells[4]??null)),y:f(vbVal(cells[5]??null))},rawColor:null,rawColorToken:'',internalColor:vbRound(vbVal(cells[6]??null),0),layer:vbVal(cells[7]??null),inheritedColorRule:'previous-line'};
}
// Caller owns a transition clone; this updates source drawing scratch state.
export function buildDisplayList(state: WorkState, template: LegacyTemplate, _catalog: Catalog, viewport: {width:number;height:number}): DisplayList {
  const {width,height}=viewport;if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('Invalid drawing viewport');
  if(template.sourceBytes)state.legacyBuffers=parseLegacyDrawing(Uint8Array.from(template.sourceBytes),state.legacyBuffers).buffers;
  const transform=drawingTransform(state,viewport),d=state.legacyBuffers.drawing!;
  const commands:DrawCommand[]=[];
  const list:DisplayList={width,height,transform,commands};
  const datum=Number(state.values.DrawDatum??0);
  const records=d.lc>1||Object.keys(state.legacyBuffers.lineMem).length
    ?Array.from({length:d.lc},(_,i)=>lineRecord(state,i+1))
    :[...template.records,lineRecord(state,1)];
  const mask=(x:number,y:number,w:number)=>commands.push({op:'fillRect',x,y,width:w,height:30,color:'#ffffff'});
  for(const record of records){
    d.colr=record.internalColor;
    const marker=markerFor(record);if(!marker)continue;
    const x=f(record.from.x), y=flip(record.from.y,datum);
    let text=markerText(state,record),align:'left'|'center'|'right'='center',font='bold 16pt Verdana';
    if(marker.raw){
      const len=text.length*18;
      if(state.routeId.startsWith('Flan')){mask(f(x-10),f(y-10),f(len));align='left';}
      else mask(f(x-len*.65),f(y-10),f(len*1.3));
      if(text.endsWith('*'))text=vbTrim(text.slice(0,-1)+'°');
      const delta=f(f(record.to.x)-f(record.from.x));
      if(delta===100){align='right';font='bold 28pt Verdana';}
    }else{
      mask(f(x-80),f(y-10),160);
      if(marker.bank===1&&(state.routeId==='Span1'||state.routeId.startsWith('Fxly')))mask(f(x-60),f(y-10),120);
    }
    commands.push({op:'text',text,x,y:f(y-8),font,align,color:'#062134',...(align==='right'?{verticalAlign:'bottom' as const}:{})});
  }
  for(const record of records){
    const color=d.colr=record.internalColor;if([1,6,99].includes(color))continue;
    commands.push({op:'line',from:{x:f(record.from.x),y:flip(record.from.y,datum)},to:{x:f(record.to.x),y:flip(record.to.y,datum)},color:color===7?'#c0c0c0':'#000044',width:1});
    if(color===7)continue;
    const multiplier:Record<string,number>={'150#':1.5,'300#':.5,'600#':.3,'900#':.2,'1500#':.1};
    if(Object.hasOwn(multiplier,String(state.values.ASMEClass)))state.values.AnyInt=multiplier[String(state.values.ASMEClass)];
    if(state.routeId==='Ptem1'){
      const raw=state.values.DesTemp??0,temp=f(typeof raw==='string'?vbDouble(raw,state.culture):Number(raw));
      const fahrenheit=state.values.TempSign==='C'?f(temp*1.8+32):temp;
      const pressure=f(vbDouble(String(state.values.DesignPressure??0),state.culture)),m=Number(state.values.AnyInt??0);
      const x=f(fahrenheit+400), y=f(-225-pressure*m+datum),base=f(-225+datum);
      commands.push({op:'line',from:{x:400,y},to:{x,y},color:'#ff0000',width:0},{op:'line',from:{x,y:base},to:{x,y},color:'#ff0000',width:0});
      // Source saves Single.ToString (Framework G7), then reparses it after
      // each crosshair. This can alter the next line's temperature even in F.
      state.values.DesTemp=temp===0?0:f(Number(temp.toPrecision(7)));
    }
  }
  return list;
}
