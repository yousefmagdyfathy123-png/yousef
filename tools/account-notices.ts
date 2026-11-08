import { db } from '../src/server/db/pool';
import { deliverAccountNotices } from '../src/server/mail/account-notices';
import { createSmtpMailTransport } from '../src/server/mail/smtp';

try {
  console.log(await deliverAccountNotices(db, createSmtpMailTransport()));
} finally {
  await db.end();
}
