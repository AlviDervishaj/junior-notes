export type SaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved';

export type Autosaver<T> = {
  change(value: T): void;
  flush(): Promise<void>;
  status(): SaveStatus;
  subscribe(fn: (status: SaveStatus) => void): () => void;
  dispose(): void;
};

export const DEFAULT_AUTOSAVE_DELAY = 600;

/**
 * Debounced save with an explicit flush. Framework-free so it can be unit
 * tested with fake timers, which is why the editor's save logic lives here
 * rather than inside a hook.
 *
 * On failure the pending value is retained and status becomes 'unsaved', so
 * the next keystroke or blur retries it. User input is never discarded
 * (spec §8).
 */
export function createAutosaver<T>(opts: {
  save: (value: T) => Promise<void>;
  delay?: number;
}): Autosaver<T> {
  const delay = opts.delay ?? DEFAULT_AUTOSAVE_DELAY;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { value: T } | null = null;
  let current: SaveStatus = 'idle';
  const listeners = new Set<(status: SaveStatus) => void>();

  const setStatus = (next: SaveStatus) => {
    if (next === current) return;
    current = next;
    for (const fn of listeners) fn(next);
  };

  const cancelTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const write = async (): Promise<void> => {
    if (pending === null) return;
    const { value } = pending;

    setStatus('saving');
    try {
      await opts.save(value);
      // Only clear if no newer change arrived while the write was in flight.
      if (pending !== null && pending.value === value) pending = null;
      setStatus('saved');
    } catch {
      setStatus('unsaved');
    }
  };

  return {
    change(value: T) {
      pending = { value };
      cancelTimer();
      timer = setTimeout(() => {
        timer = null;
        void write();
      }, delay);
    },

    async flush() {
      cancelTimer();
      await write();
    },

    status: () => current,

    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },

    dispose() {
      cancelTimer();
      listeners.clear();
      pending = null;
    },
  };
}
