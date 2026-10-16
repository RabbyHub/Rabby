import { useEffect, useState } from 'react';
import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { useWallet } from '@/ui/utils/WalletContext';
import { WALLETCONNECT_CLOCK_SKEW } from '@/utils/walletconnect-error';

export const useWalletConnectClockSkew = (enabled = true) => {
  const wallet = useWallet();
  const [hasClockSkew, setHasClockSkew] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setHasClockSkew(false);
      return;
    }
    let active = true;
    let revision = 0;
    const onTransportError = (data: { code?: string } | undefined) => {
      if (data?.code !== WALLETCONNECT_CLOCK_SKEW) return;
      revision++;
      setHasClockSkew(true);
    };
    const onInited = (data: { uri?: string } | undefined) => {
      // Coinbase also emits INITED; only a WalletConnect URI proves recovery.
      if (!data?.uri?.startsWith('wc:')) return;
      revision++;
      setHasClockSkew(false);
    };

    eventBus.addEventListener(
      EVENTS.WALLETCONNECT.TRANSPORT_ERROR,
      onTransportError
    );
    eventBus.addEventListener(EVENTS.WALLETCONNECT.INITED, onInited);
    const hydrationRevision = revision;
    wallet.getWalletConnectTransportErrorCode().then(
      (code) => {
        if (active && revision === hydrationRevision) {
          setHasClockSkew(code === WALLETCONNECT_CLOCK_SKEW);
        }
      },
      () => undefined
    );

    return () => {
      active = false;
      eventBus.removeEventListener(
        EVENTS.WALLETCONNECT.TRANSPORT_ERROR,
        onTransportError
      );
      eventBus.removeEventListener(EVENTS.WALLETCONNECT.INITED, onInited);
    };
  }, [wallet, enabled]);

  return enabled && hasClockSkew;
};
