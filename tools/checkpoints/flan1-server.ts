// Managed checkpoint ONLY. No import from deployable Next routes. Never bind publicly.
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { loadCatalog } from '../../src/server/catalog';
import { requireLegacyCulture } from '../../src/server/legacy-culture';
import { createInitialState } from '../../src/legacy/state/initial';
import { transition } from '../../src/legacy/state/transition';
import { publicActionSchema } from '../../src/shared/public-schemas';
import { loopbackTestAccess } from './loopback-access';
import { toPublicWorkResult } from '../../src/server/engineering/public-result';
import { advanceWorkspaceUi } from '../../src/server/engineering/ui-state';
import type { WorkState,WorkAction } from '../../src/legacy/contracts';
// The server-only marker is resolved through Node's react-server condition.
const port=3186,origin=`http://127.0.0.1:${port}`,culture=requireLegacyCulture(process.env);
if(process.env.NODE_ENV==='production')throw new Error('Checkpoint harness is not deployable');
const catalog=await loadCatalog(resolve('private/catalog'));
const access=loopbackTestAccess(origin,{id:'managed-workspace-test'});
const bundle=await build({entryPoints:['tools/checkpoints/flan1-entry.tsx'],bundle:true,platform:'browser',format:'iife',write:false,outfile:'.local/checkpoint.js',jsx:'automatic'});
const script=bundle.outputFiles!.find(f=>f.path.endsWith('.js'))!.contents;
const css=bundle.outputFiles!.find(f=>f.path.endsWith('.css'))?.contents??Buffer.from('');
const sessions=new Map<string,{csrf:string;state:WorkState;busy:boolean}>();
function action(value:unknown):WorkAction{return publicActionSchema.parse(value);}
const server=createServer(async(req,res)=>{
  const reply=(status:number,value:string|Uint8Array,type='text/plain')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(value);};
  try{
    if(req.headers.host!==`127.0.0.1:${port}`)return reply(403,'Checkpoint request denied');
    await access(new Request(origin+(req.url??'/')));
    if(req.method==='GET'&&req.url==='/checkpoint.js')return reply(200,script,'application/javascript');
    if(req.method==='GET'&&req.url==='/checkpoint.css')return reply(200,css,'text/css');
    if(req.method==='GET'&&req.url==='/'){
      const id=randomBytes(24).toString('hex'),csrf=randomBytes(24).toString('hex');
      const result=transition(createInitialState(culture),{type:'select-route',routeId:'Flan1'},catalog);
      advanceWorkspaceUi(createInitialState(culture),result);
      sessions.set(id,{csrf,state:result.state,busy:false});res.setHeader('Set-Cookie',`checkpoint=${id}; HttpOnly; SameSite=Strict; Path=/`);
      const data=JSON.stringify({csrf,initial:toPublicWorkResult(id,result,catalog)}).replaceAll('<','\\u003c');
      return reply(200,`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Alfadata</title><link rel="stylesheet" href="/checkpoint.css"></head><body><div id="root"></div><script type="application/json" id="checkpoint-data">${data}</script><script src="/checkpoint.js" defer></script></body></html>`,'text/html; charset=utf-8');
    }
    if(req.method!=='POST'||req.url!=='/action')return reply(404,'Not found');
    const id=/(?:^|;\s*)checkpoint=([a-f0-9]+)/.exec(req.headers.cookie??'')?.[1],session=id?sessions.get(id):undefined;
    if(!session||req.headers.origin!==origin||req.headers['x-checkpoint-csrf']!==session.csrf||req.headers['content-type']!=='application/json')return reply(403,'Checkpoint request denied');
    if(session.busy)return reply(409,'Checkpoint action in progress');
    session.busy=true;
    try{
      const chunks:Buffer[]=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>8192)return reply(413,'Checkpoint request too large');chunks.push(chunk);}
      const command=action(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      const result=transition(session.state,command,catalog);advanceWorkspaceUi(session.state,result);
      const dto=toPublicWorkResult(id!,result,catalog);session.state=result.state;
      return reply(200,JSON.stringify(dto),'application/json');
    }finally{session.busy=false;}
  }catch{return reply(400,'Checkpoint action failed');}
});
server.listen(port,'127.0.0.1',()=>process.stdout.write(`Alfadata managed workspace ${origin}\n`));
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>server.close(()=>process.exit(0)));
