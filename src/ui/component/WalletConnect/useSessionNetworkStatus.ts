import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { isSameAddress, useWallet } from '@/ui/utils';
import React from 'react';

export type NetworkStatus = 'FAST' | 'LOW' | 'LOWER';

export const useSessionNetworkStatus = (
  account?: { address: string; brandName: string },
  pendingConnect?: boolean
) => {
  const wallet = useWallet();
  const [delay, setDelay] = React.useState<number>(0);

  React.useEffect(() => {
    const handleSessionChange = (data: {
      delay: number;
      address: string;
      brandName: string;
    }) => {
      if (
        isSameAddress(data.address, account?.address ?? '') &&
        data.brandName === account?.brandName
      ) {
        setDelay(data.delay);
      }
    };

    eventBus.addEventListener(
      EVENTS.WALLETCONNECT.SESSION_NETWORK_DELAY,
      handleSessionChange
    );

    return () => {
      eventBus.removeEventListener(
        EVENTS.WALLETCONNECT.SESSION_NETWORK_DELAY,
        handleSessionChange
      );
    };
  }, [account, pendingConnect]);

  React.useEffect(() => {
    if (account) {
      wallet
        .getWalletConnectSessionNetworkDelay(account.address, account.brandName)
        .then((result) => result && setDelay(result));
    }
  }, [account]);

  const status: NetworkStatus = React.useMemo(() => {
    if (delay >= 400) {
      return 'LOWER';
    }
    if (delay >= 200) {
      return 'LOW';
    }
    return 'FAST';
  }, [delay]);

  return { status, delay };
};
