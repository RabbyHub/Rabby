import { EVENTS } from '@/constant';
import { useWallet } from '@/ui/utils';
import { useEffect, useState } from 'react';
import { useEventBusListener } from './useEventBusListener';

export const useWalletUnlocked = () => {
  const wallet = useWallet();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    wallet
      .isUnlocked()
      .then((value) => {
        if (cancelled) {
          return;
        }
        setIsUnlocked(value);
        setIsReady(true);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setIsUnlocked(false);
        setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [wallet]);

  useEventBusListener(EVENTS.UNLOCK_WALLET, () => {
    setIsUnlocked(true);
    setIsReady(true);
  });

  useEventBusListener(EVENTS.LOCK_WALLET, () => {
    setIsUnlocked(false);
    setIsReady(true);
  });

  return {
    isUnlocked,
    isReady,
  };
};
