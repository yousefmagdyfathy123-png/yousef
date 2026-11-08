import { expect,test,vi } from 'vitest';
vi.mock('server-only',()=>({}));
vi.mock('../../src/server/auth/principal', () => ({ getPrincipal: async () => null }));
import { requireEngineeringAccess } from '../../src/server/engineering/access';
import { loopbackTestAccess } from '../../tools/checkpoints/loopback-access';
test('engineering access denies requests without a verified session',async()=>{
  await expect(requireEngineeringAccess(new Request('http://localhost/workspace',{headers:{'X-User':'owner'}}))).rejects.toMatchObject({ reason: 'unauthenticated' });
});
test('explicit harness principal is usable only on its exact loopback origin',async()=>{
  const guard=loopbackTestAccess('http://127.0.0.1:3186',{id:'managed-test'});
  expect(await guard(new Request('http://127.0.0.1:3186/action'))).toEqual({id:'managed-test'});
  await expect(guard(new Request('https://example.com/action'))).rejects.toThrow('Engineering access denied');
  expect(()=>loopbackTestAccess('http://0.0.0.0:3186',{id:'test'})).toThrow();
});
