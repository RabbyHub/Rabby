import { EVENTS, KEYRING_CLASS, KEYRING_TYPE_TEXT } from '@/constant';
import eventBus from '@/eventBus';
import { isSameAddress, useWallet } from '@/ui/utils';
import React from 'react';

/**
 * @param account
 */
export const useSessionChainId = (
  account?: { address: string; brandName: string },
  pendingConnect?: boolean
) => {
  const wallet = useWallet();
  const [chainId, setChainId] = React.useState<number>();

  React.useEffect(() => {
    const handleSessionChange = (data: {
      chainId?: number;
      address: string;
      brandName: string;
    }) => {
      if (
        isSameAddress(data.address, account?.address ?? '') &&
        data.brandName === account?.brandName
      ) {
        setChainId(data.chainId);
      }
    };

    eventBus.addEventListener(
      EVENTS.WALLETCONNECT.SESSION_ACCOUNT_CHANGED,
      handleSessionChange
    );

    return () => {
      eventBus.removeEventListener(
        EVENTS.WALLETCONNECT.SESSION_ACCOUNT_CHANGED,
        handleSessionChange
      );
    };
  }, [account, pendingConnect]);

  React.useEffect(() => {
    if (account) {
      wallet
        .getWalletConnectSessionAccount(account.address, account.brandName)
        .then((result) => result && setChainId(result.chainId));
    }
  }, [account]);

  return chainId;
};
