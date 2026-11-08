import { describe, expect, test } from 'vitest';
import reference from '../reference/vb.json';
import { vbVal, vbDouble, vbInt, vbSingle, vbRound } from '../../src/legacy/vb/numbers';
import { vbCompare, vbString } from '../../src/legacy/vb/strings';
import { vbLike } from '../../src/legacy/vb/like';
import { formatLegacyDimension } from '../../src/legacy/vb/fractions';
import type { FormatInput } from '../../src/legacy/vb/fractions';
import type { LegacyCulture } from '../../src/legacy/contracts';
export const culture: LegacyCulture = { name: 'en-US', decimalSeparator: '.', groupSeparator: ',' };
type Fixture = { op: string; args: unknown[]; expected: { value?: unknown; error?: string } };
function run({ op, args: a }: Fixture): unknown {
  switch (op) {
    case 'val': return vbVal(a[0] as string | null);
    case 'double': return vbDouble(a[0] as string | null, culture);
    case 'int': return vbInt(a[0] as number);
    case 'single': return vbSingle(a[0] as number);
    case 'round': return vbRound(a[0] as number, a[1] as number);
    case 'string': return vbString(a[0] as number, culture);
    case 'compare': return vbCompare(a[0] as string, a[1] as string, a[2] as boolean, culture);
    case 'like': return vbLike(a[0] as string, a[1] as string, culture);
    case 'dimension': return formatLegacyDimension({ route: a[0], bank: a[1], cell: a[2], units: a[3], fractions: a[4], inchSign: a[5], culture } as FormatInput);
    default: throw new Error('Unrecognized independent fixture operation');
  }
}
describe('independent Windows Framework 4 / VB10 en-US reference', () => {
  for (const [index, row] of reference.cases.entries()) {
    const f = row as Fixture;
    test(`${index}: ${f.op} ${JSON.stringify(f.args)}`, () => {
      if (f.expected.error) expect(() => run(f)).toThrowError(expect.objectContaining({ name: f.expected.error }));
      else {
        const value = run(f);
        if (f.expected.value === 'NaN' && f.op === 'double') expect(value).toBeNaN();
        else if (f.op === 'double' && f.expected.value === 'Infinity') expect(value).toBe(Infinity);
        else if (f.op === 'double' && f.expected.value === '-Infinity') expect(value).toBe(-Infinity);
        else if (typeof value === 'number' && value === 0 && f.expected.value === 0) expect(value === 0).toBe(true);
        else expect(value).toEqual(f.expected.value);
      }
    });
  }
});
