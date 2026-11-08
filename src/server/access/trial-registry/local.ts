import { closeSync, openSync, statSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { validDecision, type TrialLookup, type TrialRegistry } from './types';

export function initializeLocalRegistry(file: string, namespace: string): void {
  if (process.env.NODE_ENV === 'production' || !namespace) throw new Error('Invalid local trial registry setup');
  closeSync(openSync(file, 'wx', 0o600));
  const db = new DatabaseSync(file);
  try {
    db.exec(`
      PRAGMA synchronous = FULL;
      BEGIN IMMEDIATE;
      CREATE TABLE registry_metadata (namespace TEXT NOT NULL);
      CREATE TABLE trial_decisions (subject TEXT PRIMARY KEY, decision TEXT NOT NULL);
    `);
    db.prepare('INSERT INTO registry_metadata VALUES (?)').run(namespace);
    db.exec('COMMIT');
  } finally {
    db.close();
  }
}

export function localRegistry(file: string, namespace: string): TrialRegistry {
  if (process.env.NODE_ENV === 'production') throw new Error('Local trial registry is development only');

  function access(subject: string, proposed?: unknown): TrialLookup {
    try {
      if (!statSync(file).isFile()) return { status: 'unknown' };
      // A lookup may need write access to recover a hot journal after a crash.
      const db = new DatabaseSync(file, { timeout: 5000 });
      try {
        // A writable SQLite open can create an empty file. Only provisioned metadata authorizes writes.
        const metadata = db.prepare('SELECT namespace FROM registry_metadata').all();
        if (metadata.length !== 1 || metadata[0].namespace !== namespace) return { status: 'unknown' };
        if (proposed !== undefined) {
          if (!validDecision(proposed, subject)) return { status: 'unknown' };
          db.exec('PRAGMA synchronous = FULL; BEGIN IMMEDIATE;');
          db.prepare('INSERT INTO trial_decisions VALUES (?, ?) ON CONFLICT(subject) DO NOTHING')
            .run(subject, JSON.stringify(proposed));
        }
        const row = db.prepare('SELECT decision FROM trial_decisions WHERE subject = ?').get(subject);
        if (proposed !== undefined) db.exec('COMMIT');
        if (!row) return { status: 'absent' };
        const decision: unknown = JSON.parse(String(row.decision));
        return validDecision(decision, subject) ? { status: 'found', decision } : { status: 'unknown' };
      } finally {
        db.close();
      }
    } catch {
      return { status: 'unknown' };
    }
  }

  return {
    async lookup(subject) { return access(subject); },
    async createIfAbsent(subject, proposed) { return access(subject, proposed); },
  };
}
