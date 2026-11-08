import type { LegacyCulture } from '../contracts';
import { assertLegacyCulture } from './culture';
// Framework Microsoft.VisualBasic.Strings.Trim, not String.Trim/JS trim.
export function vbTrim(text:string|null):string{return (text??'').replace(/^[ \u3000]+|[ \u3000]+$/g,'');}
// Framework Single.ToString uses G7. Registry.SetValue stores Singles as
// strings, so a subsequent Val/read can change the last Single precision bits.
export function vbSingleString(n:number,c:LegacyCulture):string{
  assertLegacyCulture(c);n=Math.fround(n);
  if(!Number.isFinite(n))return Number.isNaN(n)?'NaN':n<0?'-∞':'∞';
  if(n===0)return '0';
  const rounded=Number(n.toPrecision(7)),exponent=Math.floor(Math.log10(Math.abs(rounded)));
  if(exponent< -4||exponent>=7){const [m,e]=rounded.toExponential(6).split('e');return m.replace(/\.?0+$/,'')+'E'+(Number(e)<0?'-':'+')+Math.abs(Number(e)).toString().padStart(2,'0');}
  return vbString(rounded,c);
}
export function vbString(n: number, c: LegacyCulture): string {
  assertLegacyCulture(c);
  if (!Number.isFinite(n)) return Number.isNaN(n) ? 'NaN' : n < 0 ? '-Infinity' : 'Infinity';
  if (n === 0) return '0';
  // Framework's default Double general format has fifteen significant digits.
  const rounded = Number(n.toPrecision(15));
  const exponent = Math.floor(Math.log10(Math.abs(rounded)));
  if (exponent < -4 || exponent >= 15) {
    const [mantissa, exp] = rounded.toExponential(14).split('e');
    return `${mantissa.replace(/\.?0+$/, '')}E${Number(exp) < 0 ? '-' : '+'}${Math.abs(Number(exp)).toString().padStart(2, '0')}`;
  }
  return rounded.toFixed(Math.max(0, 14 - exponent)).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}
const textCollator = new Intl.Collator('en-US', { sensitivity: 'accent', usage: 'sort' });
export function vbCompare(a: string | null, b: string | null, textCompare: boolean, c: LegacyCulture): number {
  assertLegacyCulture(c);
  a ??= ''; b ??= '';
  if (!textCompare) return a === b ? 0 : a < b ? -1 : 1;
  // Windows word-sort defers apostrophes and hyphens until primary comparison.
  const expand = (s: string) => s.normalize('NFKC').replace(/[\u00df\u1e9e]/g,'ss').replace(/[\u00e6\u00c6]/g,'ae').replace(/[\u0153\u0152]/g,'oe');
  a = expand(a); b = expand(b);
  const primary = Math.sign(textCollator.compare(a.replace(/['-]/g, ''), b.replace(/['-]/g, '')));
  if (primary) return primary;
  if (a.replace(/['-]/g, '').length !== a.length || b.replace(/['-]/g, '').length !== b.length) {
    const marks = (s: string): { position: number; weight: number }[] => {
      let position = 0;
      const out: { position: number; weight: number }[] = [];
      for (const ch of s) { if (ch === "'" || ch === '-') out.push({ position, weight: ch === "'" ? 1 : 2 }); else position++; }
      return out;
    };
    const left = marks(a), right = marks(b);
    for (let i = 0; i < Math.min(left.length,right.length); i++) {
      const order = right[i].position - left[i].position || left[i].weight - right[i].weight;
      if (order) return Math.sign(order);
    }
    return Math.sign(left.length - right.length);
  }
  return Math.sign(textCollator.compare(a, b));
}
