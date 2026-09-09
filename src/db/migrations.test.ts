import { DATABASE_VERSION, migrate } from '@/db/migrations';
import type { SqlDb } from '@/db/types';
import { createTestDb } from '../../tests/support/test-db';

const userVersion = async (db: SqlDb) =>
  (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []))?.user_version ?? 0;

describe('migrate', () => {
  test('a fresh database starts at version 0', async () => {
    expect(await userVersion(createTestDb())).toBe(0);
  });

  test('brings a fresh database to the current version', async () => {
    const db = createTestDb();
    await migrate(db);
    expect(await userVersion(db)).toBe(DATABASE_VERSION);
  });

  test('creates the notes table with the expected columns', async () => {
    const db = createTestDb();
    await migrate(db);
    const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(notes)', []);
    expect(cols.map((c) => c.name).sort()).toEqual(
      ['body', 'category', 'created_at', 'deleted_at', 'id', 'pinned', 'title', 'updated_at'].sort()
    );
  });

  test('creates the active-notes index', async () => {
    const db = createTestDb();
    await migrate(db);
    const idx = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='notes'",
      []
    );
    expect(idx.map((i) => i.name)).toContain('idx_notes_active');
  });

  test('is idempotent - running twice does not throw or change the version', async () => {
    const db = createTestDb();
    await migrate(db);
    await migrate(db);
    expect(await userVersion(db)).toBe(DATABASE_VERSION);
  });

  test('defaults let a row be inserted with only timestamps', async () => {
    const db = createTestDb();
    await migrate(db);
    await db.runAsync('INSERT INTO notes (created_at, updated_at) VALUES (?, ?)', [1, 1]);
    const row = await db.getFirstAsync<{ title: string; body: string; pinned: number }>(
      'SELECT title, body, pinned FROM notes',
      []
    );
    expect(row).toEqual({ title: '', body: '', pinned: 0 });
  });
});
