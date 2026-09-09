import { DatabaseSync } from 'node:sqlite';

test('logic project runs in a real node environment', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE t (a INTEGER)');
  db.prepare('INSERT INTO t VALUES (?)').run(1);
  expect(db.prepare('SELECT a FROM t').all()).toEqual([{ a: 1 }]);
});
