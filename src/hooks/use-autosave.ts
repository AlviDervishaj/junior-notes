import { useEffect, useMemo, useRef, useState } from 'react';

import { createAutosaver, DEFAULT_AUTOSAVE_DELAY, type SaveStatus } from '@/lib/autosave';

/**
 * React wrapper over the pure autosaver. The save callback is held in a ref so
 * that changing it does not recreate the saver and drop a pending write.
 */
export function useAutosave<T>(
  save: (value: T) => Promise<void>,
  delay: number = DEFAULT_AUTOSAVE_DELAY
) {
  const saveRef = useRef(save);
  saveRef.current = save;

  const [status, setStatus] = useState<SaveStatus>('idle');

  const saver = useMemo(
    () => createAutosaver<T>({ save: (value) => saveRef.current(value), delay }),
    [delay]
  );

  useEffect(() => {
    const unsubscribe = saver.subscribe(setStatus);
    return () => {
      unsubscribe();
      // Flush before tearing down so unmounting mid-edit still persists.
      void saver.flush().finally(() => saver.dispose());
    };
  }, [saver]);

  return { status, change: saver.change, flush: saver.flush };
}
