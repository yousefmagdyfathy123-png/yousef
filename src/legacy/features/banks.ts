import type { WorkState, Catalog, TraceEvent } from '../contracts';
import { readCell,writeCell } from '../state/buffers';
import { vbRound,vbVal } from '../vb/numbers';
import { fractionizeLegacyText } from '../vb/fractions';
const fractions=['1/16','1/8','3/16','1/4','5/16','3/8','7/16','1/2','9/16','5/8','11/16','3/4','13/16','7/8','15/16'];
const decimal:Record<string,string>={'0+1/8':'0.125','0+1/4':'0.25','0+3/8':'0.375','0+1/2':'0.5','0+3/4':'0.75','1+1/4':'1.25','1+1/2':'1.5','2+1/2':'2.5','3+1/2':'3.5'};
export function loadBank(state:WorkState,catalog:Catalog,index:1|2|3|4,path:string,sensor:number,minimum:number,trace:TraceEvent[]):number {
  const table=catalog.table(path),width=vbRound(vbVal(table.rows[0]?.[0]??null),0);
  state.values['DataFolder'+index]=path.split('/')[0];state.values['DataBaseName'+index]=path.split('/')[1].slice(0,-4);
  state.values['Sensor'+index]=sensor;state.values.ColCount=String(width);
  trace.push({operation:'load-bank',sourceId:path});
  for(let i=0;i<table.rows.length;i++)for(let j=0;j<width;j++){
    const value=table.rows[i][j];if(value===undefined)throw new Error('Source bank row is short');
    writeCell(state.legacyBuffers,index,i+1,j+1,value);
  }
  let qty=table.rows.length;
  if(index===1)for(let i=qty;i>=minimum+2;i--){
    if(readCell(state.legacyBuffers,index,i,sensor)==='N/A')writeCell(state.legacyBuffers,index,i,sensor,'');
    if((readCell(state.legacyBuffers,index,i,sensor)??'')!==''){qty=i;break;}
  }
  const conversionQty=index===4?Number(state.values.LineQtyDbase2??0):qty;
  for(let i=1;i<=conversionQty;i++){
    for(let j=1;j<=width;j++){
      let text=readCell(state.legacyBuffers,index,i,j)??'';
      if(index===1&&fractions.some(f=>text==='0+'+f))text=text.slice(2);
      if(index===2){if(['0+1/8','0+1/4','0+3/8','0+1/2','0+3/4'].includes(text))text=text.slice(2);if(text==='2+1/2')text='2.5';}
      if(index===3||index===4)text=decimal[text]??text;
      writeCell(state.legacyBuffers,index,i,j,text);
    }
    const columns:Record<string,number>={Flan:22+Number(state.values.FaceIndex),Flaa:22+Number(state.values.FaceIndex),Flap:10,Orif:22+Number(state.values.FaceIndex),Fl6b:34,Flbx:14};
    const col=columns[state.routeId.slice(0,4)];
    if(index===1&&col&&state.values.Fractionize==='Yes')writeCell(state.legacyBuffers,1,i,col,fractionizeLegacyText(readCell(state.legacyBuffers,1,i,col)??'',state.culture));
  }
  state.values['LineQtyDbase'+index]=qty;
  // Source c is shared by table loading and LoadDrawing; it is not per parser.
  (state.legacyBuffers.drawing??={lineVar2:{},c:0,colr:0,linetype:0,sc:1,lc:1,factor:0}).c=table.rows.length+1;
  return qty;
}
