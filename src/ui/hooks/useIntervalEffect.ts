import { useEffect, useRef } from 'react';

/**
 * Like `setInterval` but in form of react hook.
 *
 * @param callback Callback to be called within interval.
 * @param ms Interval delay in milliseconds, `undefined` disables the interval.
 * Keep in mind, that changing this parameter will re-set interval, meaning
 * that it will be set as new after the change.
 */
export function useIntervalEffect(callback: () => void, ms?: number): void {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!ms && ms !== 0) {
      return;
    }

    const id = setInterval(() => cbRef.current(), ms);

    return () => clearInterval(id);
  }, [ms]);
}

export default useIntervalEffect;
