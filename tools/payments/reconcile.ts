import { Pool } from 'pg';
import { withDatabase } from '../db/local';
import { configuredPaymentProvider } from '../../src/server/commerce/providers/unconfigured';
import { createReconciliation, paymentRecoverySettings, resumePaymentReview } from '../../src/server/commerce/reconciliation';

const args = process.argv.slice(2);
if (args.length && (args[0] !== '--resume' || args.length !== 3)) {
  throw new Error('Usage: payments:reconcile [--resume ORDER_ID ADMIN_USER_ID]');
}
await withDatabase(async url => {
  const database = new Pool({ connectionString: url });
  try {
    if (args.length) {
      if (!await resumePaymentReview(database, args[1], args[2])) throw new Error('Payment review was not resumed');
      console.log('Payment review resumed.');
    } else {
      const worker = createReconciliation(database, configuredPaymentProvider, paymentRecoverySettings());
      const { claimed, results } = await worker.reconcileDueOrders();
      console.log(JSON.stringify({ claimed, review: results.filter(result => result.kind === 'needs-review').length }));
    }
  } finally {
    await database.end();
  }
});
