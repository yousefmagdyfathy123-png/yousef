import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { countryDecision, type CountryDecision } from './country';
import { withPurchaseLock } from './purchase-lock';

export type Currency = 'EGP' | 'SAR' | 'USD';
export type Price = { currency: Currency; minorUnits: number };
export type Quote = { id: string; userId: string; price: Price; country: CountryDecision; status: 'open' | 'consumed' };
type QuoteRow = {
  id: string; user_id: string; currency: Currency; minor_units: number; country_code: string | null;
  country_source: CountryDecision['source']; status: Quote['status'];
};

export function priceForCountry(code: string | null): Price {
  if (code === 'EG') return { currency: 'EGP', minorUnits: 100000 };
  if (code === 'SA') return { currency: 'SAR', minorUnits: 50000 };
  return { currency: 'USD', minorUnits: 10000 };
}

function toCountry(code: string | null, source: CountryDecision['source']): CountryDecision {
  return source === 'unknown' ? { countryCode: null, source } : countryDecision(code, source);
}

export async function getOrCreateQuote(userId: string, database?: Pool): Promise<Quote> {
  return withPurchaseLock(database ?? (await import('../db/pool')).db, userId, async client => {
    const existing = await client.query<QuoteRow>("SELECT * FROM quotes WHERE user_id = $1 AND status = 'open'", [userId]);
    if (existing.rows[0]) {
      const row = existing.rows[0];
      return {
        id: row.id, userId, price: { currency: row.currency, minorUnits: row.minor_units },
        country: toCountry(row.country_code, row.country_source), status: row.status,
      };
    }
    const account = await client.query<{ registration_country_code: string | null; registration_country_source: CountryDecision['source'] }>(
      'SELECT registration_country_code, registration_country_source FROM "user" WHERE id = $1', [userId],
    );
    if (!account.rows[0]) throw new Error('Unknown quote account');
    const country = toCountry(account.rows[0].registration_country_code, account.rows[0].registration_country_source);
    const price = priceForCountry(country.countryCode);
    const id = randomUUID();
    await client.query(
      'INSERT INTO quotes(id,user_id,currency,minor_units,country_code,country_source) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, userId, price.currency, price.minorUnits, country.countryCode, country.source],
    );
    return { id, userId, price, country, status: 'open' };
  });
}
