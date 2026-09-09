import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { getNote } from '@/db/notes';
import type { Note } from '@/db/types';

/** Loads a single note. Pass null for a new note, which loads nothing. */
export function useNote(id: number | null): { note: Note | null; loading: boolean } {
  const db = useSQLiteContext();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(id !== null);

  useEffect(() => {
    if (id === null) {
      setNote(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getNote(db, id)
      .then((found) => {
        if (!cancelled) {
          setNote(found);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [db, id]);

  return { note, loading };
}
