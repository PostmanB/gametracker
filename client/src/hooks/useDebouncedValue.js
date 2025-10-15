import { useEffect, useState } from 'react';

export function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}
