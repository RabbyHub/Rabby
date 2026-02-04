import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { useDebounceFn, useEventListener, useMemoizedFn } from 'ahooks';
import { useEffect, useRef } from 'react';

export const useListenTxReload = (callback?: () => void) => {
  const shouldReloadRef = useRef(false);
  const _handleReload = useMemoizedFn(async () => {
    if (document.visibilityState !== 'visible') {
      shouldReloadRef.current = true;
      return;
    }
    callback?.();
  });

  const { run: handleReload } = useDebounceFn(_handleReload, {
    wait: 2500,
  });

  useEffect(() => {
    eventBus.addEventListener(EVENTS.RELOAD_TX, handleReload);
    return () => {
      eventBus.removeEventListener(EVENTS.RELOAD_TX, handleReload);
    };
  }, [handleReload]);

  useEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState === 'visible' && shouldReloadRef.current) {
        shouldReloadRef.current = false;
        callback?.();
      }
    },
    {
      target: () => document,
    }
  );
};
