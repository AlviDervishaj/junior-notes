import { migrate } from '@/db/migrations';
import { createNote, getNote, updateNote } from '@/db/notes';
import type { SqlDb } from '@/db/types';
import { createTestDb } from '../../tests/support/test-db';

const T0 = 1_757_000_000_000;

async function freshDb(): Promise<SqlDb> {
  const db = createTestDb();
  await migrate(db);
  return db;
}

describe('createNote', () => {
  test('returns the new id and stores the given fields', async () => {
    const db = await freshDb();
    const id = await createNote(db, { title: 'Grocery list', body: 'milk', now: T0 });

    expect(id).toBeGreaterThan(0);
    expect(await getNote(db, id)).toEqual({
      id,
      title: 'Grocery list',
      body: 'milk',
      category: null,
      pinned: false,
      createdAt: T0,
      updatedAt: T0,
    });
  });

  test('defaults title and body to empty strings', async () => {
    const db = await freshDb();
    const id = await createNote(db, { now: T0 });
    expect(await getNote(db, id)).toMatchObject({ title: '', body: '', category: null });
  });

  test('stores a category when given', async () => {
    const db = await freshDb();
    const id = await createNote(db, { category: 'home', now: T0 });
    expect((await getNote(db, id))?.category).toBe('home');
  });

  test('assigns increasing ids', async () => {
    const db = await freshDb();
    const first = await createNote(db, { now: T0 });
    const second = await createNote(db, { now: T0 + 1 });
    expect(second).toBeGreaterThan(first);
  });
});

describe('getNote', () => {
  test('returns null for an id that does not exist', async () => {
    expect(await getNote(await freshDb(), 999)).toBeNull();
  });
});

describe('updateNote', () => {
  test('updates the title and bumps updated_at, leaving created_at alone', async () => {
    const db = await freshDb();
    const id = await createNote(db, { title: 'old', body: 'body', now: T0 });

    await updateNote(db, id, { title: 'new' }, T0 + 5000);

    expect(await getNote(db, id)).toMatchObject({
      title: 'new',
      body: 'body',
      createdAt: T0,
      updatedAt: T0 + 5000,
    });
  });

  test('updates the body without touching the title', async () => {
    const db = await freshDb();
    const id = await createNote(db, { title: 'keep', body: 'old', now: T0 });
    await updateNote(db, id, { body: 'new' }, T0 + 1);
    expect(await getNote(db, id)).toMatchObject({ title: 'keep', body: 'new' });
  });

  test('updates both fields at once', async () => {
    const db = await freshDb();
    const id = await createNote(db, { now: T0 });
    await updateNote(db, id, { title: 't', body: 'b' }, T0 + 1);
    expect(await getNote(db, id)).toMatchObject({ title: 't', body: 'b' });
  });

  test('an empty patch still bumps updated_at', async () => {
    const db = await freshDb();
    const id = await createNote(db, { now: T0 });
    await updateNote(db, id, {}, T0 + 9);
    expect((await getNote(db, id))?.updatedAt).toBe(T0 + 9);
  });

  test('stores text containing quotes and semicolons verbatim', async () => {
    const db = await freshDb();
    const nasty = `Robert'); DROP TABLE notes;-- "quoted" 100%`;
    const id = await createNote(db, { title: nasty, body: nasty, now: T0 });

    expect(await getNote(db, id)).toMatchObject({ title: nasty, body: nasty });
    // The table must still exist.
    expect(await getNote(db, id)).not.toBeNull();
  });
});
