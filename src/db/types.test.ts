import type { SQLiteDatabase } from 'expo-sqlite';

import { rowToNote, type NoteRow, type SqlDb } from '@/db/types';

/**
 * Compile-time guard: the real expo-sqlite database must remain assignable to
 * our narrow SqlDb interface. If expo changes those signatures this fails
 * `tsc --noEmit` here, rather than at the call site in src/app/_layout.tsx.
 *
 * Type-level only — it must emit no runtime code, since SQLiteDatabase has no
 * value to construct in a Node test environment.
 */
type Assert<T extends true> = T;
type RealDatabaseSatisfiesSqlDb = Assert<SQLiteDatabase extends SqlDb ? true : false>;

const row = (over: Partial<NoteRow> = {}): NoteRow => ({
  id: 1,
  title: 'Grocery list',
  body: 'milk',
  category: null,
  pinned: 0,
  created_at: 10,
  updated_at: 20,
  deleted_at: null,
  ...over,
});

describe('rowToNote', () => {
  test('maps snake_case columns to the domain type', () => {
    expect(rowToNote(row())).toEqual({
      id: 1,
      title: 'Grocery list',
      body: 'milk',
      category: null,
      pinned: false,
      createdAt: 10,
      updatedAt: 20,
    });
  });

  test('normalises SQLite integer booleans', () => {
    expect(rowToNote(row({ pinned: 1 })).pinned).toBe(true);
    expect(rowToNote(row({ pinned: 0 })).pinned).toBe(false);
  });

  test('keeps a recognised category', () => {
    expect(rowToNote(row({ category: 'home' })).category).toBe('home');
  });

  test('drops an unrecognised category rather than trusting the column', () => {
    expect(rowToNote(row({ category: 'bogus' })).category).toBeNull();
  });

  test('does not expose deleted_at on the domain type', () => {
    expect(rowToNote(row({ deleted_at: 99 }))).not.toHaveProperty('deletedAt');
  });
});
