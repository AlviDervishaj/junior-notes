import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { listNotes, searchNotes } from '@/db/notes';
import type { Note } from '@/db/types';

/**
 * Notes for the list or, when `query` is given, for a search.
 *
 * Re-reads on focus rather than holding a client cache: SQLite is the cache,
 * and at a personal notebook's scale re-querying is simpler and strictly more
 * correct than diffing in memory (spec §4.4).
 */
export function useNotes(query?: string): {
  notes: Note[];
  loading: boolean;
  reload: () => void;
} {
  const db = useSQLiteContext();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const rows = query === undefined ? await listNotes(db) : await searchNotes(db, query);
    setNotes(rows);
    setLoading(false);
  }, [db, query]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void load().catch(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  return { notes, loading, reload: () => void load() };
}
