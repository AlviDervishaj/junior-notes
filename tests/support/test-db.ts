import { DatabaseSync } from 'node:sqlite';

import type { SqlDb, SqlRunResult, SqlValue } from '@/db/types';

/**
 * Wraps Node's built-in synchronous SQLite in the async SqlDb interface so the
 * db layer can be tested against a real database engine rather than a mock.
 *
 * Note: node:sqlite returns `lastInsertRowid` (lowercase d) where expo-sqlite
 * uses `lastInsertRowId`. This adapter normalises to expo's spelling.
 */
export function createTestDb(): SqlDb {
  const db = new DatabaseSync(':memory:');

  return {
    async execAsync(source: string): Promise<void> {
      db.exec(source);
    },
    async runAsync(source: string, params: SqlValue[]): Promise<SqlRunResult> {
      const result = db.prepare(source).run(...(params as never[]));
      return {
        lastInsertRowId: Number(result.lastInsertRowid),
        changes: Number(result.changes),
      };
    },
    async getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]> {
      return db.prepare(source).all(...(params as never[])) as T[];
    },
    async getFirstAsync<T>(source: string, params: SqlValue[]): Promise<T | null> {
      return (db.prepare(source).get(...(params as never[])) as T | undefined) ?? null;
    },
  };
}
