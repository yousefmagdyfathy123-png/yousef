import type { WorkState,InputResult } from '../contracts';
import { vbDouble } from '../vb/numbers';
import { saveSettings } from './settings';
// frmDataInput_Fxly.Button4_Click is the wired OK handler. Its mismatched
// temperature error keys and Imperial lower-bound Units test are intentional.
export function applyLegacyInput(state:WorkState,fieldId:string,raw:string):InputResult {
  if(!/^Fxly[12]$/.test(state.routeId)||!['AmbTemp','DesTemp','Length'].includes(fieldId))throw new Error('Input is not available');
  const next=structuredClone(state),v=next.values,imperial=v.Units==='Imperial',loop=state.routeId==='Fxly2';
  const messages=fieldId==='Length'?[`Please enter a numerical value between ${imperial?(loop?40:20):(loop?1000:500)} and ${imperial?(loop?8000:4000):(loop?200000:100000)} ${imperial?'Inches':'mm'}`]:[];
  try {
    const n=vbDouble(raw,state.culture),value=Math.fround(fieldId==='Length'?n:Math.floor(n));
    if(fieldId==='Length'&&Number.isFinite(n)&&!Number.isFinite(value))throw new Error('Invalid Single');
    v[fieldId]=value;
    const invalid=fieldId==='Length'?(imperial?value>(loop?8000:4000):value>(loop?200000:100000)||value<(loop?1000:500)):
      v.DegUnits==='Fahrenheit'?value>700||value< -100:value>400||value< -80;
    if(invalid)throw new Error('Source invalid empty Single conversion');
    saveSettings(next);return {ok:true,state:next};
  }catch{return {ok:false,state:next,messages};}
}
