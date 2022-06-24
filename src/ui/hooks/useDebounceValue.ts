import { useState, useEffect } from 'react';

export default function useDebounceValue<T>(value: T, delay = 1000) {
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
