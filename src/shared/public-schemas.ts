type Schema<T>={parse:(value:unknown)=>T};
export type Infer<S>=S extends Schema<infer T>?T:never;
const fail=():never=>{throw new Error('Invalid public work result');};
const str:Schema<string>={parse:v=>typeof v==='string'?v:fail()};
const num:Schema<number>={parse:v=>typeof v==='number'&&Number.isFinite(v)?v:fail()};
const bool:Schema<boolean>={parse:v=>typeof v==='boolean'?v:fail()};
const literal=<T extends string>(...values:T[]):Schema<T>=>({parse:v=>values.includes(v as T)?v as T:fail()});
const array=<T>(schema:Schema<T>):Schema<T[]>=>({parse:v=>Array.isArray(v)&&Reflect.ownKeys(v).length===v.length+1&&Object.keys(v).length===v.length&&Object.keys(v).every((key,index)=>key===String(index))?v.map(x=>schema.parse(x)):fail()});
const optional=<T>(schema:Schema<T>):Schema<T|undefined>=>({parse:v=>v===undefined?undefined:schema.parse(v)});
function union<S extends readonly Schema<unknown>[]>(...schemas:S):Schema<Infer<S[number]>>{
  return {parse:v=>{for(const schema of schemas){try{return schema.parse(v) as Infer<S[number]>;}catch{ /* Try the next public variant. */ }}return fail();}};
}
type ObjectType<S extends Record<string,Schema<unknown>>>={ [K in keyof S as undefined extends Infer<S[K]>?never:K]:Infer<S[K]> }&{[K in keyof S as undefined extends Infer<S[K]>?K:never]?:Exclude<Infer<S[K]>,undefined>};
function object<S extends Record<string,Schema<unknown>>>(shape:S):Schema<ObjectType<S>>{
  return {parse:v=>{
    if(!v||typeof v!=='object'||Array.isArray(v)||Reflect.ownKeys(v).some(k=>typeof k!=='string'||!Object.hasOwn(shape,k)))return fail();
    const result:Record<string,unknown>={};for(const [key,schema] of Object.entries(shape)){
      const value=schema.parse((v as Record<string,unknown>)[key]);if(value!==undefined)result[key]=value;
    }return result as ObjectType<S>;
  }};
}
const point=object({x:num,y:num});
const layout=object({x:num,y:num,width:num,height:num});
const option=object({value:str,text:str,enabled:bool});
export {layout as publicLayoutSchema,option as publicOptionSchema};
export const publicControlSchema=object({id:str,type:str,text:str,options:array(option),enabled:bool,checked:bool,visible:bool,layout});
const line=object({op:literal('line'),from:point,to:point,color:str,width:num});
const fill=object({op:literal('fillRect'),x:num,y:num,width:num,height:num,color:str});
const text=object({op:literal('text'),text:str,x:num,y:num,font:str,align:literal('left','center','right'),color:str,verticalAlign:optional(literal('top','bottom'))});
export const publicCommandSchema:Schema<Infer<typeof line>|Infer<typeof fill>|Infer<typeof text>>={parse:v=>{
  if(!v||typeof v!=='object')return fail();const op=(v as Record<string,unknown>).op;
  return op==='line'?line.parse(v):op==='fillRect'?fill.parse(v):op==='text'?text.parse(v):fail();
}};
const transform:Schema<number[]>={parse:v=>{const a=array(num).parse(v);return a.length===6?a:fail();}};
export const publicDrawingSchema=object({width:num,height:num,transform,commands:array(publicCommandSchema)});
const row=object({id:str,label:str,value:str,unit:str,kind:optional(literal('input','output'))});
export const publicTextResultsSchema=object({status:literal('available','unavailable'),rows:array(row)});
const visibility:Schema<Record<string,boolean>>={parse:v=>{
  if(!v||typeof v!=='object'||Array.isArray(v))return fail();
  if(Reflect.ownKeys(v).some(k=>typeof k!=='string'||!Object.prototype.propertyIsEnumerable.call(v,k)))return fail();
  const out:Record<string,boolean>={};for(const [k,x] of Object.entries(v)){
    if(!/^(Label[1-7]|drawing)$/.test(k))return fail();out[k]=bool.parse(x);
  }return out;
}};
const commandIndices:Schema<number[]>={parse:v=>{
  const indices=array(num).parse(v);
  if(!indices.length||indices.some(i=>!Number.isSafeInteger(i)||i<0)||new Set(indices).size!==indices.length)fail();
  return indices;
}};
export const publicDrawingPresentationSchema=object({primaryCommandIndices:commandIndices});
export const publicViewSchema=object({headers:array(str),controls:array(publicControlSchema),drawing:publicDrawingSchema,messages:array(str),visibility,textResults:optional(publicTextResultsSchema),presentation:optional(publicDrawingPresentationSchema)});
export const publicSettingsSchema=object({units:literal('Metric','Imperial'),listUnits:literal('Inches','Millimetres'),temperature:literal('Celsius','Fahrenheit'),fractions:bool});
export const publicActionSchema=union(
  object({type:literal('select-route'),routeId:str}),object({type:literal('search'),query:str}),
  object({type:literal('select-option'),controlId:str,value:str}),object({type:literal('input'),fieldId:str,raw:str}),
  object({type:literal('configure'),units:literal('Metric','Imperial'),listUnits:literal('Inches','Millimetres'),temperature:literal('Celsius','Fahrenheit'),fractions:bool}),
  object({type:literal('back','forward','reset')}));
export const publicDialogSchema=object({id:literal('about','configuration','search','parameters','flexibility'),title:str,
  controls:array(object({id:str,text:str,value:str,options:array(object({value:str,text:str}))})),blocks:array(str),fieldId:optional(str)});
export const publicEffectSchema=union(object({kind:literal('none')}),object({kind:literal('work'),action:publicActionSchema}),
  object({kind:literal('dialog'),dialog:publicDialogSchema}),object({kind:literal('host'),operation:literal('print','close')}));
const navigationWidth:Schema<220|270|275|400>={parse:v=>typeof v==='number'&&[220,270,275,400].includes(v)?v as 220|270|275|400:fail()};
export const publicSearchHitSchema=object({id:str,text:str,context:optional(str)});
export const publicUiSchema=object({routeId:str,selectedTabId:str,titleText:str,navigationWidth,settings:publicSettingsSchema,
  tabs:array(object({id:str,text:str})),
  items:array(object({id:str,text:str,enabled:bool,checked:bool,visible:bool,layout,children:array(str),effect:publicEffectSchema}))});
export const publicResultSchema=object({workspaceId:str,revision:num,view:publicViewSchema,ui:optional(publicUiSchema),searchHits:optional(array(publicSearchHitSchema)),inputAccepted:optional(bool)});
export function parsePublicWorkResult(value:unknown):Infer<typeof publicResultSchema>{
  try{
    const dto=publicResultSchema.parse(value);
    if(!dto.workspaceId||!Number.isSafeInteger(dto.revision)||dto.revision<0||dto.view.textResults?.status==='unavailable'&&dto.view.textResults.rows.length)fail();
    if(dto.ui&&dto.ui.selectedTabId!==''&&!dto.ui.tabs.some(tab=>tab.id===dto.ui!.selectedTabId))fail();
    if(dto.view.presentation?.primaryCommandIndices.some(i=>i>=dto.view.drawing.commands.length))fail();
    return dto;
  }catch{return fail();}
}
