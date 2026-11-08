import { completeReviewedDeletion, requestAccountDeletion } from '../../src/server/account/deletion';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { migrate } from '../../tools/db/migrate';
import { announceClosure, getClosure } from '../../src/server/account/closure';
import { deletionDeadline } from '../../src/server/account/calendar';
import { deliverAccountNotices } from '../../src/server/mail/account-notices';
import { createOrders } from '../../src/server/commerce/orders';
import { getOrCreateQuote } from '../../src/server/commerce/pricing';

const database = new Pool({ connectionString: process.env.ALFADATA_TEST_DATABASE_URL });
beforeAll(async () => { await migrate(database); });
afterAll(() => database.end());

test('deadline counts only listed business days using the calendar timezone', () => {
  const calendar = {
    timeZone: 'America/New_York', policyText: 'Synthetic only',
    businessDates: ['2026-10-30','2026-11-02','2026-11-03','2026-11-04','2026-11-05',
      '2026-11-06','2026-11-09','2026-11-10','2026-11-11'],
  };
  expect(deletionDeadline(calendar, new Date('2026-10-31T02:00:00Z'))?.toISOString()).toBe('2026-11-11T05:00:00.000Z');
  expect(deletionDeadline(calendar, new Date('2026-11-03T00:00:00Z'))?.toISOString()).toBe('2026-11-12T05:00:00.000Z');
  expect(deletionDeadline(calendar, new Date('2026-11-04T00:00:00Z'))).toBeNull();
});

test('closure blocks new checkout reservations and survives a mail transport failure', async () => {
  const userId = randomUUID(), sessionId = randomUUID(), email = userId + '@example.invalid';
  await database.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES ($1,$1,$2,true)', [userId, email]);
  await database.query('INSERT INTO user_roles(user_id,role) VALUES ($1,$2)', [userId, 'admin']);
  await database.query(`INSERT INTO "session"(id,token,"userId","expiresAt","updatedAt")
    VALUES ($1,$1,$2,now()+interval '1 hour',now())`, [sessionId, userId]);
  const actor = { userId, sessionId, role: 'admin' as const, emailVerified: true, suspended: false };
  const quote = await getOrCreateQuote(userId, database);
  const createCheckout = vi.fn(async () => ({ url: 'https://example.invalid/pay', reference: 'fixture' }));
  const provider = { id: 'fixture', environment: 'test' as const, currencies: new Set(['USD' as const]), createCheckout };
  await expect(announceClosure(actor, new Date(Date.now() + 86_400_000), database)).rejects.toThrow();
  const shutdown = new Date(Date.now() + 61 * 86_400_000);
  try {
    const racingBuyer = randomUUID();
    await database.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES ($1,$1,$2,true)',
      [racingBuyer, racingBuyer + '@example.invalid']);
    const racingQuote = await getOrCreateQuote(racingBuyer, database);
    const [announcement, order] = await Promise.allSettled([
      announceClosure(actor, shutdown, database),
      createOrders(database).createOrder(racingBuyer, racingQuote.id, 'racing', provider),
    ]);
    expect(announcement.status).toBe('fulfilled');
    if (order.status === 'fulfilled') {
      const { rows } = await database.query<{ before: boolean }>(
        'SELECT o.created_at < c.announced_at AS before FROM orders o CROSS JOIN service_closure c WHERE o.id=$1',
        [order.value.id],
      );
      expect(rows[0].before).toBe(true);
    } else {
      expect(order.reason).toMatchObject({ reason: 'service-closure' });
    }
    createCheckout.mockClear();
    await expect(createOrders(database).createOrder(userId, quote.id, 'late', provider)).rejects
      .toMatchObject({ reason: 'service-closure' });
    expect(createCheckout).not.toHaveBeenCalled();
    await database.query("UPDATE account_notice_outbox SET next_attempt_at=now()+interval '1 day' WHERE recipient<>$1", [email]);
    const send = vi.fn().mockRejectedValueOnce(new Error('mail offline')).mockResolvedValue(undefined);
    expect(await deliverAccountNotices(database, { send })).toEqual({ sent: 0, unconfirmed: 1 });
    expect(await getClosure(database)).toEqual({ shutdown_at: shutdown });
    await database.query('UPDATE account_notice_outbox SET next_attempt_at=now() WHERE recipient=$1', [email]);
    expect(await deliverAccountNotices(database, { send })).toEqual({ sent: 1, unconfirmed: 0 });
  } finally {
    await database.query("DELETE FROM account_notice_outbox WHERE kind='closure'");
    await database.query('DELETE FROM service_closure');
  }
});

test('duplicate requests retain their deadline and failed processing rolls back without notification', async () => {
  const userId = randomUUID(), sessionId = randomUUID(), email = userId + '@example.invalid';
  await database.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES ($1,$1,$2,true)', [userId, email]);
  await database.query(`INSERT INTO "session"(id,token,"userId","expiresAt","updatedAt")
    VALUES ($1,$1,$2,now()+interval '1 hour',now())`, [sessionId, userId]);
  const principal = { userId, sessionId, role: 'user' as const, emailVerified: true, suspended: false };
  vi.stubEnv('DELETION_BUSINESS_CALENDAR', JSON.stringify({
    timeZone: 'UTC', policyText: 'Synthetic calendar',
    businessDates: Array.from({ length: 20 }, (_, index) =>
      new Date(Date.now() + (index - 2) * 86_400_000).toISOString().slice(0, 10)),
  }));
  try {
    const requests = await Promise.all([requestAccountDeletion(principal, database), requestAccountDeletion(principal, database)]);
    expect(requests[0]).toEqual(requests[1]);
    const { rows: [request] } = await database.query<{ id: string }>(
      'UPDATE deletion_requests SET reviewed_at=now() WHERE user_id=$1 RETURNING id', [userId],
    );
    await expect(completeReviewedDeletion(database, request.id, async () => {})).rejects.toThrow();
    expect((await database.query('SELECT completed_at FROM deletion_requests WHERE id=$1', [request.id])).rows)
      .toEqual([{ completed_at: null }]);
    expect((await database.query('SELECT 1 FROM account_notice_outbox WHERE recipient=$1', [email])).rowCount).toBe(0);

    // Synthetic policy fixture with no financial or independently retained records.
    expect(await completeReviewedDeletion(database, request.id, async (client, id) => {
      await client.query('DELETE FROM "user" WHERE id=$1', [id]);
    })).toBe(true);
    expect(await completeReviewedDeletion(database, request.id, async () => {})).toBe(false);
    const send = vi.fn().mockRejectedValueOnce(new Error('mail offline')).mockResolvedValue(undefined);
    expect(await deliverAccountNotices(database, { send })).toEqual({ sent: 0, unconfirmed: 1 });
    await database.query('UPDATE account_notice_outbox SET next_attempt_at=now() WHERE recipient=$1', [email]);
    expect(await deliverAccountNotices(database, { send })).toEqual({ sent: 1, unconfirmed: 0 });
    expect((await database.query('SELECT 1 FROM "user" WHERE id=$1', [userId])).rowCount).toBe(0);
  } finally {
    vi.unstubAllEnvs();
  }
});
