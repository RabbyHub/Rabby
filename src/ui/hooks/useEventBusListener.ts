import eventBus from '@/eventBus';
import { useMemoizedFn } from 'ahooks';
import { useEffect } from 'react';

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
