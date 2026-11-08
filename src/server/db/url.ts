export function databaseUrl(value = process.env.DATABASE_URL): string {
  if (!value) throw new Error('DATABASE_URL must name an app-owned PostgreSQL database');
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.pathname.length < 2) {
    throw new Error('DATABASE_URL must be a PostgreSQL URL with an explicit database name');
  }
  return value;
}
