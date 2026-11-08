import type { WorkState, LegacyView } from '../contracts';
export type SharedChecks = { enabled: Record<string, boolean[]>; checked: Record<string, boolean> };
export function getSharedOptions(state:WorkState):Record<string,{value:string;text:string;enabled:boolean}[]> {
  const labels:Record<string,string[]>={ASMEClass:['150#','300#','400#','600#','900#','1500#','2500#'],Sch:['5s','5','10s','10','20','30','40s','STD','40','60','80s','XS','80','100','120','140','160','XXS'],Face:['RF','RTJ'],Rating:['2000#','3000#','6000#','9000#'],ValveClass:['800#','1500#'],DinClass:['2.5','6','10','25','40','63','100','160','250','320','400'],Table:['A','D','E','F','H','J','K','R','S','T'],APIRatingIndex:state.values.Units==='Imperial'?['2000 PSI','3000 PSI','5000 PSI','10000 PSI','15000 PSI','20000 PSI']:['13.8 MPa','20.7 MPa','34.5 MPa','69.0 MPa','103.5 MPa','138.0 MPa']};
  return Object.fromEntries(Object.entries(labels).map(([field,items])=>[field,items.map((text,index)=>({value:field==='APIRatingIndex'?String(index+1):text,text,enabled:true}))]));
}
const groups:Record<string,string[]>={Blnu:['mnuLineBlanks'],Nuts:['mnuNuts'],Wbol:['mnuWeldedBranches'],Comp:['mnuASMEComposite'],Gpas:['mnuSpacing'],Span:['mnuSafeSpans'],Fxly:['mnuPipeFlexibility']};
for(const [menu,tab,families] of [
  ['mnuFlanges','FlangeTab','Flan Flaa Flap Orif Fl6b Flbx Flre Flco Fldi Flhb Flbs'],
  ['mnuGaskets','GasketTab','Gflt Gspr Grtj'],['mnuFittings','FittingTab','Ftbw Ftsc Ftsw'],
  ['mnuValves','ValveTab','Vlfl Vlbw Vlsc Vlsw'],['mnuPipe','PipeTab','Pipe Piwt'],['mnuStrainers','StrainersTab','Srra Srrb Srrc Srrd Srre']
])families.split(' ').forEach((family,index)=>{groups[family]=[`${tab}${index+1}`,menu];});
export function getSharedChecks(state:WorkState):SharedChecks {
  const checked:Record<string,boolean>={};
  for(const name of Object.values(groups).flat())checked[name]=false;
  for(let i=1;i<=26;i++)checked[`Combo1_Tab${i}`]=false;
  const subtab=Number(state.routeId.slice(4));
  if(subtab>=1&&subtab<=26)checked[`Combo1_Tab${subtab}`]=true;
  for(const name of groups[state.routeId.slice(0,4)]??[])checked[name]=true;
  const enabled=Object.fromEntries(Object.entries({ValveClass:2,Rating:4,TableClass:10,DINClass:12,Schedule:18,ASMEClass:7,APIRating:6}).map(([name,count])=>[name,Array<boolean>(count).fill(true)]));
  return {enabled,checked};
}
export function applySharedChecks(state:WorkState,view:LegacyView):void {
  const checks=getSharedChecks(state);
  for(let i=0;i<6;i++)view.headers[i]='';
  for(const c of view.controls){
    if(/^Btn[1-6]$/.test(c.sourceId)){c.layout.width=80;c.showDropDownArrow=false;}
    if(Object.hasOwn(checks.checked,c.sourceId))c.checked=checks.checked[c.sourceId];
  }
}
