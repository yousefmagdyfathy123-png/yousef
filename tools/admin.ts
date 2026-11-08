import { createAdministration } from '../src/server/admin/service';

const [action, userId, ...extra] = process.argv.slice(2);
if (action !== 'grant' || !userId || extra.length) {
  console.error('Usage: npx tsx tools/admin.ts grant <existing-user-id>');
  process.exitCode = 1;
} else {
  const { db } = await import('../src/server/db/pool');
  try {
    await createAdministration(db).grantAdmin(userId);
    console.log('Administrator role granted.');
  } finally {
    await db.end();
  }
}
