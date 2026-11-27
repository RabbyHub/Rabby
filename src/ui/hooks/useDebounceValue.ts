import { useState, useEffect } from 'react';

/**
 * @deprecated in most case, use useDebouncedValue instead
 */
export default function useSyncStaleValue<T>(value: T, delay = 1000) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (debouncedValue === value) return;
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [debouncedValue, value, delay]);
  return debouncedValue;
}

export function useDebouncedValue<T>(value: T, delay: number = 1000): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
