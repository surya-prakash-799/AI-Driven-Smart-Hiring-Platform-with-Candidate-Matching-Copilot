import { useCallback, useEffect, useRef, useState } from 'react';

export function useDebounce<T>(value: T, delay = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      setDebouncedValue(value);
      return;
    }
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  const flush = useCallback(() => {
    setDebouncedValue(value);
  }, [value]);

  return debouncedValue;
}
