import { expect,test } from 'vitest';
import { readFileSync,existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ui from '../reference/ui/source-ui.json';
import runtime from '../../src/legacy/ui/source-data.json';
const hash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
test('Task10 source, resources, extractor, fixtures and all315 wired IL handlers remain pinned',()=>{
  const card=JSON.parse(readFileSync('evidence/task10-acceptance.json','utf8'));
  expect(runtime).toEqual(ui);expect(hash(card.fixtures.path)).toBe(card.fixtures.hash);expect(hash(card.extractor.path)).toBe(card.extractor.hash);
  expect(readFileSync(card.fixtures.path,'utf8')).not.toContain('\r');
  expect(card.events).toHaveLength(315);
  for(const ref of card.sourceRefs)expect(hash('../'+ref.path),ref.path).toBe(ref.hash);
  for(const path of card.tests)expect(existsSync(path)).toBe(true);
  const methods=JSON.parse(readFileSync('../audit/executable/methods.json','utf8'));
  for(const event of card.events){
    const method=methods.find((m:{type:string;name:string})=>m.type==='Pipedata_Pro_14_1.frmPipedata'&&m.name===event.handler);
    expect(event.ilSha256).toBe(method.il_sha256);expect(event.rva).toBe(method.rva);expect(event.token).toBe(method.token);
  }
});
test('parameter content quirk and public identity exception have exact source anchors',()=>{
  const source=readFileSync('../audit/executable/Pipedata_Pro_14_1.frmParameters.cs','utf8');
  const load=source.slice(source.indexOf('private void frmParameters_Load'));
  expect(load).toContain('ParametersImperial.txt');expect(load).toContain('ParametersMetric.txt');expect(load).not.toContain('ProcessArea');
  const about=readFileSync('../audit/executable/Pipedata_Pro_14_1.frmAbout.cs','utf8');
  expect(about).toContain('Unless otherwise stated all material weights and mechanical properties are based on carbon steel.');
  const module=readFileSync('../audit/executable/Pipedata_Pro_14_1.Module1.cs','utf8');
  expect(module.slice(module.indexOf('public static void Notes()'),module.indexOf('public static void CheckTrialPeriod()'))).toMatch(/try\s*\{\s*\}/);
});
