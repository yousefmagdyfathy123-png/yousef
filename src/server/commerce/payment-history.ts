import type { Pool } from 'pg';
import { paymentEvents } from './events';
import { PaymentHistoryGap, type HistoryPage } from './payment-types';
import type { PaymentProvider } from './providers/types';
import { claimProviderRequest, paymentRecoverySettings, recoveryDefaults, withProviderTimeout } from './reconciliation';

type Cursor = { cursor: string | null; generation: string; incomplete: boolean };
const pageLimit = 5;
const recordLimit = 200;

export function createPaymentHistory(database: Pool) {
  const events = paymentEvents(database);
  return async function syncPaymentHistory(provider: PaymentProvider) {
    const history = provider.recovery?.history;
    if (!history) return { kind: 'unsupported' as const, processed: 0 };
    const settings = { ...recoveryDefaults, ...paymentRecoverySettings() };
    const keys = [provider.id, provider.environment];
    await database.query(`INSERT INTO payment_history_cursors(provider,environment)
      VALUES ($1,$2) ON CONFLICT DO NOTHING`, keys);
    let processed = 0;
    for (let count = 0; count < pageLimit; count++) {
      const { rows: [current] } = await database.query<Cursor>(
        'SELECT * FROM payment_history_cursors WHERE provider=$1 AND environment=$2', keys,
      );
      let page: HistoryPage;
      let incomplete = current.incomplete;
      if (!await claimProviderRequest(database, provider, settings.providerRequestsPerMinute)) {
        return { kind: 'rate-limited' as const, processed };
      }
      try {
        page = await withProviderTimeout(settings.timeoutMs, signal => history.readPage(current.cursor, signal));
      } catch (error) {
        if (!(error instanceof PaymentHistoryGap)) return { kind: 'unavailable' as const, processed };
        incomplete = true;
        await database.query(`UPDATE payment_history_cursors SET incomplete=true
          WHERE provider=$1 AND environment=$2 AND generation=$3`, [...keys, current.generation]);
        if (!history.catchUp) return { kind: 'incomplete' as const, processed };
        if (!await claimProviderRequest(database, provider, settings.providerRequestsPerMinute)) {
          return { kind: 'incomplete' as const, processed };
        }
        try {
          page = await withProviderTimeout(settings.timeoutMs, signal => history.catchUp!(current.cursor, signal));
        } catch {
          return { kind: 'incomplete' as const, processed };
        }
      }
      if (!page || !Array.isArray(page.records) || page.records.length > recordLimit ||
          (page.nextCursor !== null && (typeof page.nextCursor !== 'string' || page.nextCursor.length > 4096)) ||
          (page.hasMore && (!page.nextCursor || page.nextCursor === current.cursor)) ||
          page.records.some(record => !record || typeof record.id !== 'string' || !/^[!-~]{1,512}$/.test(record.id))) {
        // Without valid transport identities, a bad page cannot be durably deduplicated.
        await database.query(`UPDATE payment_history_cursors SET incomplete=true
          WHERE provider=$1 AND environment=$2 AND generation=$3`, [...keys, current.generation]);
        return { kind: 'incomplete' as const, processed };
      }
      for (const record of page.records) {
        const key = [...keys, record.id];
        const seen = await database.query(
          'SELECT 1 FROM payment_history_records WHERE provider=$1 AND environment=$2 AND id=$3', key,
        );
        if (seen.rowCount) continue;
        const fact = record.observation;
        const result = fact?.provider === provider.id && fact.environment === provider.environment &&
            typeof fact.orderId === 'string' && /^[!-~]{1,128}$/.test(fact.orderId) &&
            Array.isArray(fact.refunds) && Array.isArray(fact.disputes)
          ? await events.applyObservation(fact, 'authenticated-history', undefined, record.id)
          : 'invalid-record';
        if (result === 'duplicate') continue;
        if (result !== 'applied') {
          await database.query(`INSERT INTO payment_history_records(provider,environment,id,result,reason)
            VALUES ($1,$2,$3,'quarantined',$4) ON CONFLICT DO NOTHING`,
          [...key, result === 'lease-lost' ? 'invalid-record' : result]);
        }
        processed++;
      }
      const advanced = await database.query(`UPDATE payment_history_cursors SET
        cursor=$4,generation=generation+1,incomplete=incomplete OR $5
        WHERE provider=$1 AND environment=$2 AND generation=$3`,
      [...keys, current.generation, page.nextCursor ?? current.cursor, incomplete]);
      if (!advanced.rowCount) return { kind: 'busy' as const, processed };
      if (!page.hasMore) return { kind: incomplete ? 'incomplete' as const : 'synced' as const, processed };
    }
    return { kind: 'more' as const, processed };
  };
}

export async function syncPaymentHistory(provider: PaymentProvider) {
  const { db } = await import('../db/pool');
  return createPaymentHistory(db)(provider);
}
