// Shared with screen selectors: preserve the existing authoritative UI names.
export const engineeringControlLabels:Record<string,string>={MainSize:'Size',ASMEClass:'ASME Class',Face:'Face Type',Sch:'Schedule'};

// Screen-only labels. Keep the original export unchanged for print snapshots.
// Meanings follow state/checks.ts, calculatorView and the flexibility dialogs.
const screenLabels:Record<string,string>={
  ...engineeringControlLabels,
  Material:'Material',AmbTemp:'Ambient Temperature',DesTemp:'Design Temperature',Length:'Length',
  SmallSize:'Smaller size',DinClass:'Pressure rating (PN)',Table:'BS 10 table',
  Rating:'Pressure rating',ValveClass:'Valve class',APIRatingIndex:'API pressure rating',
  ASMEClass2:'Pipe 2 ASME Class',InsThkIndex:'Insulation thickness',InsThk2Index:'Pipe 2 insulation thickness',
  Actuator:'Actuator',FullorEmpty:'Pipe contents',Fluid:'Fluid',Flowrate:'Flow rate',
};
// Length is reused for distinct inputs; getLegacyDialog verifies these exact routes.
const routeLabels:Record<string,Record<string,string>>={
  Fxly1:{Length:'Length to anchor'},
  Fxly2:{Length:'Length between anchors'},
};
export function engineeringControlLabel(routeId:string,controlId:string):string{
  const overrides=Object.hasOwn(routeLabels,routeId)?routeLabels[routeId]:undefined;
  if(overrides&&Object.hasOwn(overrides,controlId))return overrides[controlId];
  return Object.hasOwn(screenLabels,controlId)?screenLabels[controlId]:controlId;
}
