import type { LegacyCulture } from '../contracts';
import { assertLegacyCulture } from './culture';
import { vbError } from './numbers';
type Token = '*' | 'invalid' | ((char: string) => boolean);
export function vbLike(text: string | null, pattern: string | null, culture: LegacyCulture): boolean {
  assertLegacyCulture(culture);
  const tokens: Token[] = [], p = pattern ?? '', s = text ?? '';
  for (let i = 0; i < p.length; i++) {
    const ch = p[i];
    if (ch === '*') tokens.push('*');
    else if (ch === '?') tokens.push(() => true);
    else if (ch === '#') tokens.push(c => /\p{Decimal_Number}/u.test(c));
    else if (ch !== '[') tokens.push(c => c === ch);
    else {
      const end = p.indexOf(']', i + 1);
      if (end < 0) { tokens.push('invalid'); break; }
      const body = p.slice(i + 1, end);
      i = end;
      if (!body) continue;
      // [!] denotes the literal exclamation mark in the binary VB grammar.
      const negate = body[0] === '!' && body.length > 1;
      const list = negate ? body.slice(1) : body;
      const ranges: [string, string][] = [];
      for (let j = 0; j < list.length; j++) {
        if (j + 2 < list.length && list[j + 1] === '-') {
          if (list[j] > list[j + 2]) { tokens.push('invalid'); break; }
          ranges.push([list[j], list[j + 2]]); j += 2;
        } else ranges.push([list[j], list[j]]);
      }
      tokens.push(c => ranges.some(([lo, hi]) => c >= lo && c <= hi) !== negate);
    }
  }
  // Rolling dynamic program avoids exponential wildcard backtracking.
  let row = new Uint8Array(s.length + 1); row[0] = 1;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const next = new Uint8Array(s.length + 1);
    if (token === '*') {
      // Framework parses the remainder when entering star matching with source left.
      if (tokens.slice(i + 1).includes('invalid') && row.subarray(0,s.length).some(Boolean)) return vbError('ArgumentException');
      next[0] = row[0];
    }
    for (let j = 1; j <= s.length; j++) {
      if (token === '*') next[j] = row[j] || next[j - 1];
      else if (row[j - 1]) {
        if (token === 'invalid') return vbError('ArgumentException');
        next[j] = token(s[j - 1]) ? 1 : 0;
      }
    }
    row = next;
  }
  return row[s.length] === 1;
}
