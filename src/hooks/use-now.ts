import { useEffect, useState } from 'react';

/** How often the clock ticks. Relative dates only need minute resolution. */
const TICK_MS = 30_000;

/**
 * A timestamp that refreshes periodically.
 *
 * Calling Date.now() in a render body is an impure read: it defeats
 * memoisation and the React Compiler rejects it. Reading the clock in an
 * effect and holding it in state keeps render pure while still letting
 * "TODAY 14:32" stay accurate as time passes.
 */
export function useNow(tickMs: number = TICK_MS): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(timer);
  }, [tickMs]);

  return now;
}
