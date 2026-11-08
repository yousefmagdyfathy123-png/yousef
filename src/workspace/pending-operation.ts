import { z } from 'zod';
import { publicActionSchema } from '../shared/public-schemas';
import { isWorkspaceToken } from './asset-transport';

const token = z.string().refine(isWorkspaceToken);
const record = z.strictObject({
  version: z.literal(1),
  generation: token,
  envelope: z.strictObject({
    operationId: token,
    operationSequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    expectedRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    action: z.unknown().transform(value => publicActionSchema.parse(value)),
  }),
});
export type OperationEnvelope = z.infer<typeof record>['envelope'];

export function pendingOperation(account: string, workspace: string) {
  const key = 'alfadata/pending/v1/' + JSON.stringify([account, workspace]);
  return {
    load() {
      const value = sessionStorage.getItem(key);
      return value === null ? undefined : record.parse(JSON.parse(value));
    },
    save(envelope: OperationEnvelope, generation: string) {
      sessionStorage.setItem(key, JSON.stringify(record.parse({ version: 1, generation, envelope })));
    },
    clear() {
      sessionStorage.removeItem(key);
    },
  };
}
