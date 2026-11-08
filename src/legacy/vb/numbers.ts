import type { LegacyCulture } from '../contracts';
import { assertLegacyCulture } from './culture';
export function vbError(name: string): never { const error = new Error('Invalid legacy numeric or pattern value'); error.name = name; throw error; }
function radixNumber(raw: string, signed: boolean): number | undefined {
  const m = /^&([hHoO])([0-9a-fA-F]+)/.exec(raw);
  if (!m) return undefined;
  const base = m[1].toLowerCase() === 'h' ? 16 : 8;
  const digits = base === 8 ? m[2].match(/^[0-7]+/)?.[0] : m[2];
  if (!digits) return 0;
  let value = BigInt(base === 16 ? `0x${digits}` : `0o${digits}`);
  if (value > 0xffffffffffffffffn) return vbError('OverflowException');
  if (signed) {
    const suffix = raw[2 + digits.length];
    value = BigInt.asIntN(suffix === '&' ? (value <= 0xffffffffn ? 32 : 64) : value <= 0xffffn ? 16 : value <= 0xffffffffn ? 32 : 64, value);
    if (suffix === '%' && (value < -32768n || value > 32767n)) return vbError('OverflowException');
  } else value = BigInt.asIntN(64, value);
  return Number(value);
}
export function vbVal(raw: string | null): number {
  const s = (raw ?? '').replace(/[ \t\r\n]/g, '');
  const radix = radixNumber(s, true);
  if (radix !== undefined) return radix;
  const m = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eEdD][+-]?\d+)?/.exec(s);
  if (!m) return 0;
  let lexical = m[0].replace(/[dD]/, 'e');
  // VB's exponent scanner also accepts the exponent sign after its digits.
  const suffix = s[m[0].length];
  if (/[eE]\d+$/.test(lexical) && (suffix === '-' || suffix === '+')) lexical = lexical.replace(/([eE])(\d+)$/, `$1${suffix}$2`);
  let n = Number(lexical);
  if (!Number.isFinite(n)) return vbError('OverflowException');
  if (suffix === '%' || suffix === '&') {
    if (m[0].includes('.') || !Number.isInteger(n)) return vbError('InvalidCastException');
    if (n < (suffix === '%' ? -32768 : -2147483648) || n > (suffix === '%' ? 32767 : 2147483647)) return vbError('OverflowException');
  }
  if (suffix === '!') n = Math.fround(n);
  return n;
}
export function vbInt(n: number): number { return Math.floor(n); }
export function vbSingle(n: number): number { return Math.fround(n); }
export function vbRound(n: number, digits: number): number {
  if (!Number.isInteger(digits) || digits < 0 || digits > 15) return vbError('ArgumentOutOfRangeException');
  // Framework Math.Round scales binary doubles before its ties-to-even operation.
  if (!Number.isFinite(n) || Math.abs(n) >= 1e16) return n;
  const scale = 10 ** digits, x = n * scale, floor = Math.floor(Math.abs(x)), fraction = Math.abs(x) - floor;
  const rounded = fraction > 0.5 || (fraction === 0.5 && floor % 2 !== 0) ? floor + 1 : floor;
  return (n < 0 || Object.is(n, -0) ? -rounded : rounded) / scale;
}
export function vbDouble(raw: string | null, culture: LegacyCulture): number {
  assertLegacyCulture(culture);
  if (raw === null) return 0;
  let s = raw.trim();
  if (s === 'NaN') return NaN;
  if (s === '\u221e') return Infinity;
  if (s === '-\u221e') return -Infinity;
  if (/^&[hHoO]-/.test(s)) return vbError('ArgumentException');
  const radix = radixNumber(s, false);
  if (radix !== undefined && /^&(?:[hH][0-9a-fA-F]+|[oO][0-7]+)$/.test(s)) return radix;
  let negative = false, signSeen = false, currencySeen = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true; signSeen = true; s = s.slice(1,-1);
    if (/^\s/.test(s)) return vbError('FormatException');
  }
  // NumberStyles.Any allows a single currency token and either leading or trailing sign.
  while (/^[+$-]/.test(s) || /[+$-]$/.test(s)) {
    const leading = /^[+$-]/.test(s), ch = leading ? s[0] : s.at(-1)!;
    s = leading ? s.slice(1) : s.slice(0,-1);
    if (ch === '$') { if (currencySeen) return vbError('FormatException'); currencySeen = true; }
    else { if (signSeen) return vbError('FormatException'); signSeen = true; negative = ch === '-'; }
    // Whitespace before trailing signs/currency is allowed, after leading signs only with currency.
    if (!leading) s = s.trimEnd();
    else if (ch === '$') s = s.trimStart();
  }
  if (!/^(?:(?:\d[\d,]*)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)) return vbError('FormatException');
  const n = Number(s.replaceAll(',', '')) * (negative ? -1 : 1);
  if (!Number.isFinite(n)) return vbError('OverflowException');
  return n;
}
