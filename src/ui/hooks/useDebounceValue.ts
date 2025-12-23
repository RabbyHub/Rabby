import { useState, useEffect, useRef } from 'react';

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

export function useThrottledValueLeading<T>(value: T, delay: number = 1000): T {
  const [throttled, setThrottled] = useState(value);
  const lastTriggered = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    if (now - lastTriggered.current >= delay) {
      setThrottled(value);
      lastTriggered.current = now;
    }
  }, [value, delay]);

  return throttled;
}

export function useThrottledValueTrailing<T>(
  value: T,
  delay: number = 1000
): T {
  const [throttled, setThrottled] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setThrottled(value);
      timeoutRef.current = null;
    }, delay);

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [value, delay]);

  return throttled;
}
