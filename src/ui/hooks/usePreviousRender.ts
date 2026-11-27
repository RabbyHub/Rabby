import { useEffect, useRef } from 'react';

/**
 * Returns the value passed on the previous render (`undefined` on the first
 * render), even when it equals the current one.
 *
 * Not the same as ahooks `usePrevious`, which returns the last *different*
 * value: an effect that compares the result with the current value would see
 * a stale change again whenever it re-runs for another dependency.
 */
export function usePreviousRender<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  });

  return ref.current;
}
