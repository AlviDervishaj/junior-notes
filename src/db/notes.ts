import { escapeLike, LIKE_ESCAPE_CHAR } from '@/lib/like';
import type { NoteCategory } from '@/theme/categories';

import { rowToNote, type Note, type NoteRow, type SqlDb, type SqlValue } from './types';

const SELECT_NOTE = `
  SELECT id, title, body, category, pinned, created_at, updated_at, deleted_at
  FROM notes
`;

export type CreateNoteInput = {
  title?: string;
  body?: string;
  category?: NoteCategory | null;
  now: number;
};

export async function createNote(db: SqlDb, input: CreateNoteInput): Promise<number> {
  const { title = '', body = '', category = null, now } = input;
  const result = await db.runAsync(
    `INSERT INTO notes (title, body, category, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [title, body, category, now, now]
  );
  return result.lastInsertRowId;
}

export async function getNote(db: SqlDb, id: number): Promise<Note | null> {
  const row = await db.getFirstAsync<NoteRow>(
    `${SELECT_NOTE} WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return row ? rowToNote(row) : null;
}

/**
 * Applies a partial update. Column names come from a fixed allowlist, so no
 * caller input ever reaches the SQL string; values are always bound.
 */
export async function updateNote(
  db: SqlDb,
  id: number,
  patch: { title?: string; body?: string },
  now: number
): Promise<void> {
  const sets: string[] = [];
  const params: SqlValue[] = [];

  if (patch.title !== undefined) {
    sets.push('title = ?');
    params.push(patch.title);
  }
  if (patch.body !== undefined) {
    sets.push('body = ?');
    params.push(patch.body);
  }

  sets.push('updated_at = ?');
  params.push(now, id);

  await db.runAsync(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`, params);
}

/** Soft-deleted notes are purged after this long (spec §6). */
export const PURGE_AFTER_MS = 30 * 86_400_000;

export async function listNotes(db: SqlDb): Promise<Note[]> {
  const rows = await db.getAllAsync<NoteRow>(
    `${SELECT_NOTE}
     WHERE deleted_at IS NULL
     ORDER BY pinned DESC, updated_at DESC`,
    []
  );
  return rows.map(rowToNote);
}

export async function setPinned(
  db: SqlDb,
  id: number,
  pinned: boolean,
  now: number
): Promise<void> {
  await db.runAsync('UPDATE notes SET pinned = ?, updated_at = ? WHERE id = ?', [
    pinned ? 1 : 0,
    now,
    id,
  ]);
}

export async function setCategory(
  db: SqlDb,
  id: number,
  category: NoteCategory | null,
  now: number
): Promise<void> {
  await db.runAsync('UPDATE notes SET category = ?, updated_at = ? WHERE id = ?', [
    category,
    now,
    id,
  ]);
}

/** Soft delete, so undo is a single UPDATE that preserves the id. */
export async function softDelete(db: SqlDb, id: number, now: number): Promise<void> {
  await db.runAsync('UPDATE notes SET deleted_at = ? WHERE id = ?', [now, id]);
}

export async function restore(db: SqlDb, id: number): Promise<void> {
  await db.runAsync('UPDATE notes SET deleted_at = NULL WHERE id = ?', [id]);
}

/** Used for notes abandoned empty — nothing to restore, so no soft delete. */
export async function hardDelete(db: SqlDb, id: number): Promise<void> {
  await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
}

/** Returns the number of rows purged. Run on app start. */
export async function purgeOldDeleted(
  db: SqlDb,
  now: number,
  maxAgeMs: number = PURGE_AFTER_MS
): Promise<number> {
  const result = await db.runAsync(
    'DELETE FROM notes WHERE deleted_at IS NOT NULL AND deleted_at < ?',
    [now - maxAgeMs]
  );
  return result.changes;
}

/**
 * Case-insensitive substring search over title and body.
 *
 * LIKE with a bound parameter — the query is never interpolated. If note counts
 * ever make this slow, the migration path is an FTS5 virtual table synced by
 * trigger, which would change only this function (spec §6).
 *
 * LIKE_ESCAPE_CHAR is a module constant rather than user input, so embedding it
 * in the SQL text is safe; the search term itself is bound.
 */
export async function searchNotes(db: SqlDb, query: string): Promise<Note[]> {
  const trimmed = query.trim();
  if (trimmed === '') return [];

  const pattern = `%${escapeLike(trimmed)}%`;
  const rows = await db.getAllAsync<NoteRow>(
    `${SELECT_NOTE}
     WHERE deleted_at IS NULL
       AND (title LIKE ? ESCAPE '${LIKE_ESCAPE_CHAR}'
         OR body  LIKE ? ESCAPE '${LIKE_ESCAPE_CHAR}')
     ORDER BY updated_at DESC`,
    [pattern, pattern]
  );
  return rows.map(rowToNote);
}
