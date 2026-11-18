import { useEffect, useState } from 'react';

/**
 * Re-render with a fresh Date.now() every `ms` while `active`.
 * The value can be up to `ms` stale right after activation, so callers must
 * clamp elapsed time at 0.
 */
export function useNow(active: boolean, ms = 50): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
}
