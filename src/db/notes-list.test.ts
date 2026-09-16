import { migrate } from '@/db/migrations';
import {
  createNote, emptyTrash, getNote, hardDelete, listDeletedNotes, listNotes, PURGE_AFTER_MS,
  purgeOldDeleted, restore, setCategory, setPinned, softDelete,
} from '@/db/notes';
import type { SqlDb } from '@/db/types';
import { createTestDb } from '../../tests/support/test-db';

const T0 = 1_757_000_000_000;
const DAY = 86_400_000;

async function freshDb(): Promise<SqlDb> {
  const db = createTestDb();
  await migrate(db);
  return db;
}

describe('listNotes', () => {
  test('returns an empty array for an empty database', async () => {
    expect(await listNotes(await freshDb())).toEqual([]);
  });

  test('orders by updated_at descending', async () => {
    const db = await freshDb();
    await createNote(db, { title: 'oldest', now: T0 });
    await createNote(db, { title: 'newest', now: T0 + 2000 });
    await createNote(db, { title: 'middle', now: T0 + 1000 });

    expect((await listNotes(db)).map((n) => n.title)).toEqual(['newest', 'middle', 'oldest']);
  });

  test('puts pinned notes first, still ordered by updated_at within each group', async () => {
    const db = await freshDb();
    const old = await createNote(db, { title: 'pinned-old', now: T0 });
    await createNote(db, { title: 'unpinned-new', now: T0 + 5000 });
    const recent = await createNote(db, { title: 'pinned-new', now: T0 + 1000 });

    await setPinned(db, old, true, T0);
    await setPinned(db, recent, true, T0 + 1000);

    expect((await listNotes(db)).map((n) => n.title)).toEqual([
      'pinned-new', 'pinned-old', 'unpinned-new',
    ]);
  });

  test('excludes soft-deleted notes', async () => {
    const db = await freshDb();
    const keep = await createNote(db, { title: 'keep', now: T0 });
    const drop = await createNote(db, { title: 'drop', now: T0 + 1 });

    await softDelete(db, drop, T0 + 2);

    expect((await listNotes(db)).map((n) => n.id)).toEqual([keep]);
  });

  test('filters by category when category parameter is provided', async () => {
    const db = await freshDb();
    await createNote(db, { title: 'ideas note', category: 'ideas', now: T0 });
    await createNote(db, { title: 'home note', category: 'home', now: T0 + 1 });
    await createNote(db, { title: 'lists note', category: 'lists', now: T0 + 2 });

    const ideaNotes = await listNotes(db, 'ideas');
    expect(ideaNotes.map((n) => n.title)).toEqual(['ideas note']);

    const homeNotes = await listNotes(db, 'home');
    expect(homeNotes.map((n) => n.title)).toEqual(['home note']);
  });
});

describe('setPinned', () => {
  test('pins and unpins', async () => {
    const db = await freshDb();
    const id = await createNote(db, { now: T0 });

    await setPinned(db, id, true, T0 + 1);
    expect((await getNote(db, id))?.pinned).toBe(true);

    await setPinned(db, id, false, T0 + 2);
    expect((await getNote(db, id))?.pinned).toBe(false);
  });
});

describe('setCategory', () => {
  test('sets and clears the category', async () => {
    const db = await freshDb();
    const id = await createNote(db, { now: T0 });

    await setCategory(db, id, 'ideas', T0 + 1);
    expect((await getNote(db, id))?.category).toBe('ideas');

    await setCategory(db, id, null, T0 + 2);
    expect((await getNote(db, id))?.category).toBeNull();
  });
});

describe('softDelete and restore', () => {
  test('getNote hides a soft-deleted note', async () => {
    const db = await freshDb();
    const id = await createNote(db, { now: T0 });
    await softDelete(db, id, T0 + 1);
    expect(await getNote(db, id)).toBeNull();
  });

  test('restore brings it back with the same id and content', async () => {
    const db = await freshDb();
    const id = await createNote(db, { title: 'back', body: 'again', now: T0 });

    await softDelete(db, id, T0 + 1);
    await restore(db, id);

    expect(await getNote(db, id)).toMatchObject({ id, title: 'back', body: 'again' });
  });
});

describe('hardDelete', () => {
  test('removes the row entirely so restore cannot recover it', async () => {
    const db = await freshDb();
    const id = await createNote(db, { now: T0 });
    await hardDelete(db, id);
    await restore(db, id);
    expect(await getNote(db, id)).toBeNull();
  });
});

describe('purgeOldDeleted', () => {
  test('removes notes deleted longer ago than the threshold', async () => {
    const db = await freshDb();
    const id = await createNote(db, { now: T0 });
    await softDelete(db, id, T0);

    const purged = await purgeOldDeleted(db, T0 + PURGE_AFTER_MS + DAY);

    expect(purged).toBe(1);
    await restore(db, id);
    expect(await getNote(db, id)).toBeNull();
  });

  test('keeps notes deleted within the threshold', async () => {
    const db = await freshDb();
    const id = await createNote(db, { now: T0 });
    await softDelete(db, id, T0);

    expect(await purgeOldDeleted(db, T0 + DAY)).toBe(0);

    await restore(db, id);
    expect(await getNote(db, id)).not.toBeNull();
  });

  test('never touches live notes', async () => {
    const db = await freshDb();
    await createNote(db, { title: 'alive', now: T0 });
    await purgeOldDeleted(db, T0 + PURGE_AFTER_MS * 10);
    expect((await listNotes(db)).map((n) => n.title)).toEqual(['alive']);
  });
});

describe('listDeletedNotes and emptyTrash', () => {
  test('lists all deleted notes ordered newest deleted first', async () => {
    const db = await freshDb();
    const id1 = await createNote(db, { title: 'First deleted', now: T0 });
    const id2 = await createNote(db, { title: 'Second deleted', now: T0 + 10 });
    await createNote(db, { title: 'Active note', now: T0 + 20 });

    await softDelete(db, id1, T0 + 100);
    await softDelete(db, id2, T0 + 200);

    const deletedList = await listDeletedNotes(db);
    expect(deletedList).toHaveLength(2);
    expect(deletedList.map((n) => n.title)).toEqual(['Second deleted', 'First deleted']);
    expect(deletedList[0].deletedAt).toBe(T0 + 200);
    expect(deletedList[1].deletedAt).toBe(T0 + 100);
  });

  test('emptyTrash deletes all soft-deleted notes permanently', async () => {
    const db = await freshDb();
    const id1 = await createNote(db, { title: 'Note 1', now: T0 });
    const id2 = await createNote(db, { title: 'Note 2', now: T0 + 1 });
    const idActive = await createNote(db, { title: 'Note Active', now: T0 + 2 });

    await softDelete(db, id1, T0 + 10);
    await softDelete(db, id2, T0 + 20);

    const count = await emptyTrash(db);
    expect(count).toBe(2);

    expect(await listDeletedNotes(db)).toEqual([]);
    expect(await getNote(db, id1)).toBeNull();
    expect(await getNote(db, id2)).toBeNull();
    expect(await getNote(db, idActive)).not.toBeNull();
  });
});
