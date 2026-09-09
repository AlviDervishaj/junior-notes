import type { SqlDb } from './types';

export const DATABASE_VERSION = 1;

/**
 * Versioned schema migration, following the PRAGMA user_version pattern from
 * the SDK 57 expo-sqlite docs. Each numbered block runs once, in order; never
 * edit an existing block, append a new one.
 *
 * WAL mode is set on every run because it is a per-connection pragma.
 */
export async function migrate(db: SqlDb): Promise<void> {
  await db.execAsync(`PRAGMA journal_mode = 'wal';`);

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  let version = result?.user_version ?? 0;

  if (version >= DATABASE_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
      CREATE TABLE notes (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        title      TEXT    NOT NULL DEFAULT '',
        body       TEXT    NOT NULL DEFAULT '',
        category   TEXT             DEFAULT NULL,
        pinned     INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER          DEFAULT NULL
      );
      CREATE INDEX idx_notes_active ON notes (deleted_at, pinned DESC, updated_at DESC);
    `);
    version = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${version}`);
}
