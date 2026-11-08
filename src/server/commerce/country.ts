import { timingSafeEqual } from 'node:crypto';

export type CountryDecision =
  | { countryCode: string; source: 'trusted-edge' | 'geo-provider' }
  | { countryCode: null; source: 'unknown' };

export type CountryResolver = (request: Request) => Promise<CountryDecision>;

const isoCodes = new Set(`
AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR
GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP
KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS
MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS
RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ
UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW
`.trim().split(/\s+/));

export function countryDecision(value: string | null, source: 'trusted-edge' | 'geo-provider'): CountryDecision {
  if (value && /^[a-z]{2}$/i.test(value)) {
    const countryCode = value.toUpperCase();
    if (isoCodes.has(countryCode)) return { countryCode, source };
  }
  return { countryCode: null, source: 'unknown' };
}

// The configured ingress strips both client headers before injecting these values.
export function trustedEdgeCountryResolver(secret?: string): CountryResolver {
  if (secret !== undefined && !/^[a-f0-9]{64}$/.test(secret)) throw new Error('Invalid ALFADATA_GEO_EDGE_TOKEN');
  return async request => {
    const token = request.headers.get('x-alfadata-geo-token');
    if (secret && token && /^[a-f0-9]{64}$/.test(token) &&
        timingSafeEqual(Buffer.from(token), Buffer.from(secret))) {
      return countryDecision(request.headers.get('x-country'), 'trusted-edge');
    }
    return { countryCode: null, source: 'unknown' };
  };
}
