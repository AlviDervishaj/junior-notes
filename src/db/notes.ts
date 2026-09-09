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
