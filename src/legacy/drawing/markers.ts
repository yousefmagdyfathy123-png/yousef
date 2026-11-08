import type { LegacyLine, WorkState } from '../contracts';
import { vbRound } from '../vb/numbers';
import { formatLegacyDimension } from '../vb/fractions';
import { vbTrim } from '../vb/strings';
export function markerFor(record: LegacyLine): { bank: 1 | 2; column: number; raw: boolean } | null {
  const color=record.internalColor;if(![1,6,99].includes(color))return null;
  let delta=Math.fround(Math.fround(record.to.x)-Math.fround(record.from.x));
  if(color===1)delta=Math.abs(delta);
  return {bank:color===99?2:1,column:vbRound(delta,0),raw:color===6};
}
export function markerText(state:WorkState,record:LegacyLine):string {
  const m=markerFor(record);if(!m)throw new Error('Drawing record is not a marker');
  const row=Number(state.values.MainSize??0);
  if(!Number.isInteger(m.column)||m.column<0||m.column>1000||!Number.isInteger(row)||row<0||row>1000)throw new RangeError('Drawing bank index');
  const cell=state.legacyBuffers.activeDba[m.bank]?.[row]?.[m.column]??null;
  if(m.raw)return vbTrim(cell);
  return formatLegacyDimension({route:state.routeId,bank:m.bank,cell,units:state.values.Units==='Imperial'?'Imperial':'Metric',fractions:state.values.Fractionize==='Yes',culture:state.culture,inchSign:String(state.values.Inchsign??'')});
}
