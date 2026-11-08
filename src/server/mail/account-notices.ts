import type { Pool } from 'pg';
import type { MailTransport } from './transport';

const attemptLimit = 4;

export async function deliverAccountNotices(database: Pool, mail: MailTransport, batchSize = 50) {
  const exhausted = await database.query(`
    UPDATE account_notice_outbox SET failed_at=now()
    WHERE sent_at IS NULL AND failed_at IS NULL AND attempts >= $1 AND next_attempt_at <= now()
  `, [attemptLimit]);
  let sent = 0;
  let unconfirmed = exhausted.rowCount ?? 0;
  for (let index = 0; index < batchSize; index++) {
    const { rows: [notice] } = await database.query<{
      id: string; recipient: string; kind: string; body: string; attempts: number;
    }>(`
      WITH next AS (
        SELECT id FROM account_notice_outbox
        WHERE sent_at IS NULL AND failed_at IS NULL AND attempts < $1 AND next_attempt_at <= now()
        ORDER BY next_attempt_at,id LIMIT 1 FOR UPDATE SKIP LOCKED
      )
      UPDATE account_notice_outbox n SET attempts=attempts+1, next_attempt_at=now()+interval '15 minutes'
      FROM next WHERE n.id=next.id RETURNING n.id,n.recipient,n.kind,n.body,n.attempts
    `, [attemptLimit]);
    if (!notice) break;
    try {
      await mail.send({
        to: notice.recipient, text: notice.body,
        subject: notice.kind === 'closure' ? 'Alfadata planned service closure' : 'Alfadata account deletion completed',
      });
    } catch {
      unconfirmed++;
      if (notice.attempts >= attemptLimit) {
        await database.query('UPDATE account_notice_outbox SET failed_at=now() WHERE id=$1 AND attempts=$2',
          [notice.id, notice.attempts]);
      }
      continue;
    }
    await database.query('UPDATE account_notice_outbox SET sent_at=now() WHERE id=$1 AND attempts=$2',
      [notice.id, notice.attempts]);
    sent++;
  }
  return { sent, unconfirmed };
}
