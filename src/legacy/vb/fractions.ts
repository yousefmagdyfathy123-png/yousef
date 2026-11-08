import type { LegacyCulture, UnitSystem } from '../contracts';
import { assertLegacyCulture } from './culture';
import { vbInt, vbRound, vbVal } from './numbers';
import { vbString } from './strings';
export type FormatInput = { route: string; bank: 1 | 2; cell: string | null; units: UnitSystem; fractions: boolean; culture: LegacyCulture; inchSign: string };
function fractionize(text: string, culture: LegacyCulture): string {
  let n = vbVal(text);
  function match(value: number, prefix: string): void {
    for (let numerator = 1; numerator < 32; numerator++) {
      if (value > numerator / 32 - 1 / 64 && value < numerator / 32 + 1 / 64) {
        let a = numerator, b = 32;
        while (a % 2 === 0) { a /= 2; b /= 2; }
        text = `${prefix}${a}/${b}`;
      }
    }
  }
  if (n < 1) { match(n, ''); if (n > 1 - 1 / 64) text = '1'; }
  // Original second conditional reparses the possibly fractionized text.
  n = vbVal(text);
  if (n > 1) {
    const whole = vbInt(n), remainder = n - whole, prefix = ` ${vbString(whole, culture)}`;
    if (remainder > 0 && remainder < 1 / 64) text = prefix;
    match(remainder, `${prefix}+`);
    if (remainder > 1 - 1 / 64) text = ` ${vbString(whole + 1, culture)}`;
  }
  return text;
}
// LoadDataBase1 invokes FractionizeIfNeccessary without FormatDim or Inchsign.
export function fractionizeLegacyText(text:string,culture:LegacyCulture):string{assertLegacyCulture(culture);return fractionize(text,culture);}
export function formatLegacyDimension(input: FormatInput): string {
  const { route, bank, units, fractions, culture, inchSign } = input;
  assertLegacyCulture(culture);
  let text = input.cell ?? '';
  if (bank === 1 && (text === 'SPA' || text === 'N/A')) return text;
  if (bank === 2) text += inchSign;
  text = vbString(vbRound(vbVal(text), 2), culture);
  if (bank === 1 && units === 'Imperial') {
    const convert = ['Gpas','Nuts','Wbpi','Wbol','Flbs','Flhb','Fldi','Flco'].some(p => route.startsWith(p))
      || (route.startsWith('Ftsw') && route !== 'Ftsw14' && vbVal(route.slice(4)) > 7);
    if (convert) text = vbString(vbRound(vbVal(text) / 25.4, 2), culture);
    if (route.startsWith('Span1')) text = vbString(vbRound(vbVal(text) / 25.4, 0), culture);
  }
  if (fractions) text = fractionize(text, culture);
  return text + inchSign;
}
