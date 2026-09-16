import { migrate } from '@/db/migrations';
import { createNote, searchNotes, softDelete } from '@/db/notes';
import type { SqlDb } from '@/db/types';
import { createTestDb } from '../../tests/support/test-db';

const T0 = 1_757_000_000_000;

async function seeded(): Promise<SqlDb> {
  const db = createTestDb();
  await migrate(db);
  await createNote(db, { title: 'Grocery list', body: 'milk and the good coffee', now: T0 });
  await createNote(db, { title: 'New flat', body: 'boiler service record', now: T0 + 1 });
  await createNote(db, { title: 'Discount', body: 'saved 100% on shipping', now: T0 + 2 });
  return db;
}

describe('searchNotes', () => {
  test('matches on title', async () => {
    expect((await searchNotes(await seeded(), 'grocery')).map((n) => n.title)).toEqual([
      'Grocery list',
    ]);
  });

  test('matches on body', async () => {
    expect((await searchNotes(await seeded(), 'boiler')).map((n) => n.title)).toEqual(['New flat']);
  });

  test('is case-insensitive', async () => {
    expect((await searchNotes(await seeded(), 'GROCERY')).map((n) => n.title)).toEqual([
      'Grocery list',
    ]);
  });

  test('matches a substring mid-word', async () => {
    expect((await searchNotes(await seeded(), 'offee')).map((n) => n.title)).toEqual([
      'Grocery list',
    ]);
  });

  test('returns an empty array when nothing matches', async () => {
    expect(await searchNotes(await seeded(), 'zzzz')).toEqual([]);
  });

  test('treats % as a literal character, not a wildcard', async () => {
    expect((await searchNotes(await seeded(), '100%')).map((n) => n.title)).toEqual(['Discount']);
  });

  test('a bare % matches only notes containing a literal percent sign', async () => {
    expect((await searchNotes(await seeded(), '%')).map((n) => n.title)).toEqual(['Discount']);
  });

  test('a bare _ matches nothing here rather than every note', async () => {
    expect(await searchNotes(await seeded(), '_')).toEqual([]);
  });

  test('an empty query returns no results', async () => {
    expect(await searchNotes(await seeded(), '')).toEqual([]);
  });

  test('a whitespace-only query returns no results', async () => {
    expect(await searchNotes(await seeded(), '   ')).toEqual([]);
  });

  test('excludes soft-deleted notes', async () => {
    const db = await seeded();
    const id = await createNote(db, { title: 'Secret', now: T0 + 3 });
    await softDelete(db, id, T0 + 4);
    expect(await searchNotes(db, 'Secret')).toEqual([]);
  });

  test('orders results most recently updated first', async () => {
    const db = createTestDb();
    await migrate(db);
    await createNote(db, { title: 'note one', now: T0 });
    await createNote(db, { title: 'note two', now: T0 + 100 });
    expect((await searchNotes(db, 'note')).map((n) => n.title)).toEqual(['note two', 'note one']);
  });

  test('filters search results by category', async () => {
    const db = createTestDb();
    await migrate(db);
    await createNote(db, { title: 'Shopping note', category: 'lists', now: T0 });
    await createNote(db, { title: 'Shopping budget', category: 'home', now: T0 + 10 });

    const listsMatch = await searchNotes(db, 'Shopping', 'lists');
    expect(listsMatch.map((n) => n.title)).toEqual(['Shopping note']);

    const homeMatch = await searchNotes(db, 'Shopping', 'home');
    expect(homeMatch.map((n) => n.title)).toEqual(['Shopping budget']);
  });
});
