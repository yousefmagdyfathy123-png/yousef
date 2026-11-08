import type { Pool, PoolClient } from 'pg';

// Financial events and checkout reservations use the same account row lock.
export async function withPurchaseLock<T>(database: Pool, userId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM "user" WHERE id = $1 FOR UPDATE', [userId]);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
