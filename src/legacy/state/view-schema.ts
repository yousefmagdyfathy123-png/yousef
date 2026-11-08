import type { LegacyView } from '../contracts';
function fail():never{throw new Error('Invalid private legacy view');}
function record(v:unknown):v is Record<string,unknown>{return typeof v==='object'&&v!==null&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);}
function shape(v:unknown,required:string[],optional:string[]=[]):asserts v is Record<string,unknown>{
  if(!record(v)||required.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>!required.includes(k)&&!optional.includes(k)))fail();
}
function string(v:unknown):void{if(typeof v!=='string')fail();}
function bool(v:unknown):void{if(typeof v!=='boolean')fail();}
function number(v:unknown):void{if(typeof v!=='number'||!Number.isFinite(v))fail();}
function list(v:unknown,check:(v:unknown)=>void):void{if(!Array.isArray(v)||Object.keys(v).length!==v.length)fail();for(const item of v)check(item);}
function point(v:unknown):void{shape(v,['x','y']);number(v.x);number(v.y);}
export function validateLegacyView(v:unknown):asserts v is LegacyView{
  shape(v,['headers','controls','drawing','messages','visibility'],['textResults']);list(v.headers,string);list(v.messages,string);
  if(Object.hasOwn(v,'textResults')){
    shape(v.textResults,['status','rows']);if(v.textResults.status!=='available'&&v.textResults.status!=='unavailable')fail();
    list(v.textResults.rows,r=>{shape(r,['id','label','value','unit'],['kind']);for(const key of ['id','label','value','unit'])string(r[key]);if(Object.hasOwn(r,'kind')&&r.kind!=='input'&&r.kind!=='output')fail();});
    if(v.textResults.status==='unavailable'&&(v.textResults.rows as unknown[]).length)fail();
  }
  if(!record(v.visibility))fail();for(const value of Object.values(v.visibility))bool(value);
  list(v.controls,c=>{
    shape(c,['id','sourceId','type','text','options','enabled','checked','visible','layout','sourceRefs'],['showDropDownArrow']);
    for(const key of ['id','sourceId','type','text'])string(c[key]);for(const key of ['enabled','checked','visible'])bool(c[key]);
    if(Object.hasOwn(c,'showDropDownArrow'))bool(c.showDropDownArrow);
    shape(c.layout,['x','y','width','height']);for(const value of Object.values(c.layout))number(value);
    list(c.options,o=>{shape(o,['value','text','enabled']);string(o.value);string(o.text);bool(o.enabled);});
    list(c.sourceRefs,r=>{shape(r,['path','hash'],['line','endLine','evidenceId','token','rva','resourceOffset']);string(r.path);string(r.hash);for(const key of ['line','endLine','rva','resourceOffset'])if(Object.hasOwn(r,key))number(r[key]);for(const key of ['evidenceId','token'])if(Object.hasOwn(r,key))string(r[key]);});
  });
  shape(v.drawing,['width','height','transform','commands']);number(v.drawing.width);number(v.drawing.height);
  list(v.drawing.transform,number);if((v.drawing.transform as unknown[]).length!==6)fail();
  list(v.drawing.commands,c=>{
    if(!record(c))fail();
    if(c.op==='line'){shape(c,['op','from','to','color','width']);point(c.from);point(c.to);string(c.color);number(c.width);}
    else if(c.op==='fillRect'){shape(c,['op','x','y','width','height','color']);for(const k of ['x','y','width','height'])number(c[k]);string(c.color);}
    else if(c.op==='text'){shape(c,['op','text','x','y','font','align','color'],['verticalAlign']);for(const k of ['text','font','color'])string(c[k]);number(c.x);number(c.y);if(!['left','center','right'].includes(String(c.align)))fail();if(Object.hasOwn(c,'verticalAlign')&&!['top','bottom'].includes(String(c.verticalAlign)))fail();}
    else fail();
  });
}
