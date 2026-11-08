import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { DrawCommand } from '../../src/legacy/contracts';
export function loadTask7Cases<T>(file:string):T[]{
  const fixture=JSON.parse(readFileSync('tests/reference/fittings-pipe-branches/'+file,'utf8'));
  for(const [hash,geometry] of Object.entries(fixture.geometries??{})){
    if(createHash('sha256').update(JSON.stringify(geometry)).digest('hex')!==hash)throw new Error('Task7 fixture geometry hash mismatch');
    if(!(geometry as DrawCommand[]).every(c=>c.op==='line'))throw new Error('Task7 fixture requires literal trailing geometry');
  }
  for(const c of fixture.cases){
    const drawing=c.expected.view.drawing,ref=drawing.geometryRef;
    if(ref){
      if(!Object.hasOwn(fixture.geometries,ref))throw new Error('Missing independent fixture geometry');
      drawing.commands=[...drawing.commands,...fixture.geometries[ref]];delete drawing.geometryRef;
    }
  }
  return fixture.cases;
}
