import eventBus from '@/eventBus';
import { useMemoizedFn } from 'ahooks';
import { useCallback, useEffect, useRef } from 'react';

export const useEventBusListener = (
  event: string,
  callback: (...args: any) => void
) => {
  const handler = useMemoizedFn((...args: any) => {
    callback(...args);
  });

  useEffect(() => {
    eventBus.addEventListener(event, handler);
    return () => eventBus.removeEventListener(event, handler);
  }, [event, handler]);
};

type EventBusListener = (params?: any) => void;

/**
 * Returns an `addEventListener` for listeners registered imperatively (e.g. from
 * an async init). Every listener it adds is removed when the component unmounts,
 * and a call that lands after unmount registers nothing.
 */
export const useScopedEventBusListener = () => {
  const listenersRef = useRef<[string, EventBusListener][]>([]);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      listenersRef.current.forEach(([type, fn]) =>
        eventBus.removeEventListener(type, fn)
      );
      listenersRef.current = [];
    };
  }, []);

  return useCallback((type: string, fn: EventBusListener) => {
    if (unmountedRef.current) return;
    eventBus.addEventListener(type, fn);
    listenersRef.current.push([type, fn]);
  }, []);
};
