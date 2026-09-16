import { isNoteCategory, type NoteCategory } from '@/theme/categories';

export type SqlRunResult = { lastInsertRowId: number; changes: number };

/** Values SQLite can bind. Mirrors expo-sqlite's SQLiteBindValue, minus blobs. */
export type SqlValue = string | number | null | boolean;

/**
 * The narrow slice of expo-sqlite's SQLiteDatabase this app uses.
 *
 * Declared as an interface so tests can inject a node:sqlite adapter and the
 * db layer never imports expo-sqlite directly. expo-sqlite's SQLiteDatabase
 * satisfies this structurally — `src/db/types.test.ts` proves it at compile time.
 *
 * `params` is required rather than optional: expo-sqlite's overloads type it as
 * a non-optional SQLiteBindParams, so an optional parameter here would not be
 * assignable. Call sites with no parameters pass `[]`.
 */
export interface SqlDb {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<SqlRunResult>;
  getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params: SqlValue[]): Promise<T | null>;
}

export type NoteRow = {
  id: number;
  title: string;
  body: string;
  category: string | null;
  pinned: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type Note = {
  id: number;
  title: string;
  body: string;
  category: NoteCategory | null;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

export type DeletedNote = Note & {
  deletedAt: number;
};

/** Maps a raw row to the domain type, normalising SQLite's integer booleans. */
export function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: isNoteCategory(row.category) ? row.category : null,
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToDeletedNote(row: NoteRow): DeletedNote {
  return {
    ...rowToNote(row),
    deletedAt: row.deleted_at ?? row.updated_at,
  };
}
