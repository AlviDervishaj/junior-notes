import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { getNote } from '@/db/notes';
import type { Note } from '@/db/types';

type Loaded = { id: number; note: Note | null };

/**
 * Loads a single note. Pass null for a new note, which loads nothing.
 *
 * The result is stored keyed by id and the return value is derived from it,
 * rather than resetting state in an effect when the id changes — a synchronous
 * setState inside an effect body triggers cascading renders and is rejected by
 * the React Compiler.
 */
export function useNote(id: number | null): { note: Note | null; loading: boolean } {
  const db = useSQLiteContext();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (id === null) return;

    let cancelled = false;
    getNote(db, id)
      .then((note) => {
        if (!cancelled) setLoaded({ id, note });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ id, note: null });
      });

    return () => {
      cancelled = true;
    };
  }, [db, id]);

  if (id === null) return { note: null, loading: false };

  // A stale result from a previous id still counts as loading.
  const fresh = loaded !== null && loaded.id === id;
  return { note: fresh ? loaded.note : null, loading: !fresh };
}
