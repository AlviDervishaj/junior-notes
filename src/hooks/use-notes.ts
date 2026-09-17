import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { listDeletedNotes, listNotes, searchNotes, type NoteSortOption } from '@/db/notes';
import type { DeletedNote, Note } from '@/db/types';
import type { NoteCategory } from '@/theme/categories';

/**
 * Notes for the list or, when `query` is given, for a search.
 * Supports optional category filtering and sort preference.
 *
 * Re-reads on focus rather than holding a client cache: SQLite is the cache,
 * and at a personal notebook's scale re-querying is simpler and strictly more
 * correct than diffing in memory (spec §4.4).
 */
export function useNotes(
  query?: string,
  category?: NoteCategory | null,
  sort?: NoteSortOption
): {
  notes: Note[];
  loading: boolean;
  reload: () => void;
} {
  const db = useSQLiteContext();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const rows =
      query === undefined
        ? await listNotes(db, category, sort)
        : await searchNotes(db, query, category, sort);
    setNotes(rows);
    setLoading(false);
  }, [category, db, query, sort]);

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

/**
 * Soft-deleted notes for the Trash view.
 * Re-queries when the screen comes into focus.
 */
export function useTrashNotes(): {
  notes: DeletedNote[];
  loading: boolean;
  reload: () => void;
} {
  const db = useSQLiteContext();
  const [notes, setNotes] = useState<DeletedNote[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const rows = await listDeletedNotes(db);
    setNotes(rows);
    setLoading(false);
  }, [db]);

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
