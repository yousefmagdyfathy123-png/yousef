// Better Auth's shared options reference its optional Bun adapter.
// Alfadata runs on Node.js and supplies a PostgreSQL pool.
declare module 'bun:sqlite' {
  export class Database {
    private readonly bunSqlite: never;
  }
}
