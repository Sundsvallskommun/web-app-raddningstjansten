import { useEffect, useState } from "react";

/** Returns `value` after it has stayed unchanged for `delayMs` — for debouncing
 * search inputs so a server query isn't fired on every keystroke. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
