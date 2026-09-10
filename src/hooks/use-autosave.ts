import { useEffect, useMemo, useState } from 'react';

import { createAutosaver, DEFAULT_AUTOSAVE_DELAY, type SaveStatus } from '@/lib/autosave';

/**
 * React wrapper over the pure autosaver.
 *
 * `save` MUST be referentially stable (wrap it in useCallback). It is a
 * dependency of the saver, so a new identity builds a new saver; the cleanup
 * below flushes the outgoing one first, so no pending write is lost, but an
 * unstable callback would flush on every render and defeat the debounce.
 *
 * The earlier version held `save` in a ref to tolerate unstable callbacks,
 * but reading a ref inside the useMemo factory is a render-phase ref access
 * and the React Compiler rejects it.
 */
export function useAutosave<T>(
  save: (value: T) => Promise<void>,
  delay: number = DEFAULT_AUTOSAVE_DELAY
) {
  const [status, setStatus] = useState<SaveStatus>('idle');

  const saver = useMemo(() => createAutosaver<T>({ save, delay }), [save, delay]);

  useEffect(() => {
    const unsubscribe = saver.subscribe(setStatus);
    return () => {
      unsubscribe();
      // Flush before tearing down so unmounting — or being replaced — mid-edit
      // still persists the pending value.
      void saver.flush().finally(() => saver.dispose());
    };
  }, [saver]);

  return { status, change: saver.change, flush: saver.flush };
}
