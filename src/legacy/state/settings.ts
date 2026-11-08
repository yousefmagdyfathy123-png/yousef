import type { WorkState, LegacyValues } from '../contracts';
import { vbVal } from '../vb/numbers';
import { vbSingleString } from '../vb/strings';
const familyStores = new Set('Ftbw Ftsc Ftsw Fswa Flan Flaa Flap Orif Flre Flco Fl6b Flbx Fldi Flhb Flbs Gflt Gspr Grtj Vlfl Vlbw Vlsc Vlsw Wbol Nuts Blnu Srra Srrb Srrc Srrd Srre Fxly Span Gpas'.split(' '));
export const integerFields = new Set('MainSize SmallSize APIRatingIndex InsThkIndex InsThk2Index ShapeIndex'.split(' '));
export const numberFields = new Set([...integerFields,...'AmbTemp DesTemp Length DesignPressure CorrosionAllowance Flowrate NominalWeightIndex'.split(' ')]);
export const savedFields = 'MainSize ASMEClass Face Sch SmallSize Rating APIRatingIndex DinClass Table ValveClass PipeNominalBore PipeNominalBore2 PipeReducedSize PipeWallThk ASMEClass2 InsThkIndex InsThk2Index Material FullorEmpty AmbTemp DesTemp Length DesignPressure CorrosionAllowance MillTolerance Fluid Flowrate ShapeIndex NominalWeightIndex'.split(' ');
export function settingsKey(route: string): string { return familyStores.has(route.slice(0,4)) ? route.slice(0,4) : 'Settings'; }
export function saveSettings(state: WorkState): void {
  if (!state.legacySession) throw new Error('State schema upgrade required');
  const key=settingsKey(state.routeId), fields=key==='Vlfl' ? [...savedFields,'Actuator'] : savedFields;
  state.legacySession.settings[key]=Object.fromEntries(fields.map(f=>[f,state.values[f] ?? (numberFields.has(f) ? 0 : '')]));
}
export function applyDefaultSettings(state: WorkState): void {
  const family=state.routeId.slice(0,4), v=state.values;
  const supported='Psiz Ptem Pwal Fxly Span Comp Gpas Srre Srrd Srrc Srrb Srra Nuts Wbpi Wbol Piwt Fswa Vlsw Vlsc Vlbw Blnu Grtj Gspr Gflt Flan Flaa Flap Orif Fl6b Flbx Flre Flco Fldi Flhb Flbs Ftbw Ftsc Ftsw Vlfl Pipe'.split(' ');
  if (!supported.includes(family)) return;
  const low='Flaa Flap Orif Fl6b Flbx Flre Flco Fldi Flhb Flbs'.split(' ').includes(family);
  Object.assign(v,{MainSize:low ? 8 : ['Psiz','Ptem','Pwal','Fxly'].includes(family) ? 18 : ['Ftsc','Ftsw'].includes(family) ? 11 : 16,
    ASMEClass:'Psiz Ptem Pwal Fxly Span Comp Gpas Srre Srrd Srrc Srrb Srra'.split(' ').includes(family) ? '150#' : '300#',Face:'RF',Sch:state.routeId==='Ftbw11'?'10s':'STD',
    SmallSize:low ? 4 : family==='Ftbw'||family==='Fswa' ? 14 : family==='Ftsc'||family==='Ftsw' ? 10 : 6,
    Rating:'3000#',APIRatingIndex:'Flbx Flco Fldi Flhb Flbs'.split(' ').includes(family) ? 4 : 1,DinClass:'40',Table:'D',ValveClass:'800#',PipeNominalBore:'6',PipeWallThk:'7.11',ASMEClass2:'150#',InsThkIndex:2,InsThk2Index:2});
  if (family==='Flan' || family==='Fswa') v.PipeNominalBore2='2';
  if (family==='Fswa') v.PipeReducedSize='1';
  if (['Psiz','Ptem','Pwal','Fxly','Span','Flan'].includes(family)) Object.assign(v,{Material:'Carbon Steel',FullorEmpty:'Full'});
  if (['Psiz','Ptem','Pwal','Fxly','Flan'].includes(family)) Object.assign(v,{AmbTemp:family==='Flan'?20:86,DesTemp:family==='Flan'?100:176,Length:family==='Flan'?5000:2000});
  if (['Psiz','Ptem','Pwal','Flan'].includes(family)) Object.assign(v,{DesignPressure:100,CorrosionAllowance:0.06,MillTolerance:'12.5'});
  if (['Psiz','Flan'].includes(family)) Object.assign(v,{Fluid:'Water',Flowrate:1000});
  if (family==='Flan') Object.assign(v,{ShapeIndex:2,NominalWeightIndex:2});
  if (family==='Vlfl') v.Actuator='Lever';
}
export function loadSettings(state: WorkState): void {
  if (!state.legacySession) throw new Error('State schema upgrade required');
  const key=settingsKey(state.routeId), saved=state.legacySession.settings[key] ?? {}, v=state.values, route=state.routeId;
  for (const f of key==='Vlfl' ? [...savedFields,'Actuator'] : savedFields) v[f]=saved[f] ?? (numberFields.has(f)?0:'');
  let changed=false;
  const set=(f:string,value:string|number)=>{if(v[f]!==value){v[f]=value;changed=true;}};
  if(route==='Ftbw11' && !['5s','10s','40s'].includes(String(v.Sch))) set('Sch','10s');
  if(route.startsWith('Ftsc')) {
    const n=Number(route.slice(4));
    if([1,2,3,4,5,6,7,8,9,10,11,12,13,15,16,17,18,23,24].includes(n) && v.Rating==='9000#') set('Rating','6000#');
    if([5,6,7,8,9,10,11,12,13,15,16,17,18,23,24].includes(n) && v.Rating==='2000#') set('Rating','3000#');
    if([14,19,20,21,22].includes(n)) set('Rating','3000#');
  }
  if(route==='Ftsw10') set('Rating','3000#');
  if(route==='Flan2' && v.ASMEClass==='2500#') set('ASMEClass','1500#');
  if(route==='Flan5') {if(v.ASMEClass==='400#')set('ASMEClass','600#');if(['900#','2500#'].includes(String(v.ASMEClass)))set('ASMEClass','1500#');}
  if(route==='Flan6'&&!['5s','10s','40s'].includes(String(v.Sch)))set('Sch','40s');
  // LoadSettingsOrif corrects these before defaults and Face/Class indices.
  if(route==='Orif2'||route==='Orif3'){
    if(v.Face==='RTJ')set('Face','RF');
    if(v.ASMEClass!=='300#')set('ASMEClass','300#');
  }
  if(['Fldi4','Fldi5'].includes(route)&&v.DinClass==='2.5')set('DinClass','6');
  if(key==='Fldi' && ['160','250','320','400'].includes(String(v.DinClass))) {
    if(route!=='Fldi3')set('DinClass','100');
    if(['160','250','320','400'].includes(String(v.DinClass))) {
      if(v.MainSize===6)set('MainSize',7);if(v.MainSize===8)set('MainSize',9);
      // Source saves the complete family record even when neither size changes.
      changed=true;
    }
  }
  if(['Vlfl7','Vlfl8'].includes(route)&&['900#','1500#','2500#'].includes(String(v.ASMEClass)))set('ASMEClass','600#');
  if(route==='Srra2'&&v.ASMEClass==='600#')set('ASMEClass','300#');
  if(route==='Srrb2'&&v.ASMEClass==='300#')set('ASMEClass','150#');
  // Source corrects persisted selections before applying the missing-MainSize defaults.
  if(changed)saveSettings(state);
  if(v.MainSize===0){applyDefaultSettings(state);saveSettings(state);}
  if(key==='Fxly')for(const field of ['AmbTemp','DesTemp','Length'])v[field]=Math.fround(vbVal(vbSingleString(Number(v[field]),state.culture)));
  v.FaceIndex=v.Face==='RF'?1:2;
  const classes=['150#','300#','400#','600#','900#','1500#','2500#'], schedules=['5s','5','10s','10','20','30','40s','STD','40','60','80s','XS','80','100','120','140','160','XXS'];
  if(classes.includes(String(v.ASMEClass)))v.ASMEClassIndex=classes.indexOf(String(v.ASMEClass))+1;
  if(schedules.includes(String(v.Sch)))v.ScheduleIndex=schedules.indexOf(String(v.Sch))+1;
  v.NPS=v.ListUnits==='Inches'?'NPS':'';v.DN=v.ListUnits==='Inches'?'':'DN';
}
