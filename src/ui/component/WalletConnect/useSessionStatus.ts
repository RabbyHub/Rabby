import { EVENTS, WALLET_BRAND_TYPES } from '@/constant';
import eventBus from '@/eventBus';
import { isSameAddress, useWallet } from '@/ui/utils';
import { WALLETCONNECT_SESSION_STATUS_MAP } from '@rabby-wallet/eth-walletconnect-keyring';
import React from 'react';

type Status = keyof typeof WALLETCONNECT_SESSION_STATUS_MAP;

/**
 * WalletConnect connect status
 * if account is not provided, it will return the status no matter which account is connected
 * if account is provided, it will return the status of the provided account
 * @param account
 * @param pendingConnect - Update status only when it is CONNECTED
 */
export const useSessionStatus = (
  account?: { address: string; brandName: string },
  pendingConnect?: boolean
) => {
  const wallet = useWallet();
  const [status, setStatus] = React.useState<Status>();
  const [errorAccount, setErrorAccount] = React.useState<{
    address: string;
    brandName: string;
  }>();
  const [currAccount, setCurrAccount] = React.useState<{
    address: string;
    brandName: string;
  }>();

  React.useEffect(() => {
    const handleSessionChange = (data: {
      address: string;
      brandName: string;
      realBrandName?: string;
      status: Status;
    }) => {
      console.log(data);
      let updated: Status | undefined;
      if (
        !account?.address &&
        data.address &&
        (data.status === 'ACCOUNT_ERROR' || data.status === 'DISCONNECTED')
      ) {
        return;
      }
      if (
        !account ||
        !data.address ||
        (isSameAddress(data.address, account.address) &&
          data.brandName === account.brandName)
      ) {
        updated = data.status;
      } else if (
        data.brandName !== account.brandName &&
        data.brandName !== WALLET_BRAND_TYPES.WALLETCONNECT
      ) {
        updated = 'BRAND_NAME_ERROR';
      } else if (!isSameAddress(data.address, account.address)) {
        updated = 'ACCOUNT_ERROR';
        setErrorAccount(data);
      }

      if (pendingConnect) {
        if (updated === 'CONNECTED') {
          setStatus(updated);
        }
      } else {
        setStatus(updated);
      }

      setCurrAccount(data);
    };

    eventBus.addEventListener(
      EVENTS.WALLETCONNECT.SESSION_STATUS_CHANGED,
      handleSessionChange
    );

    return () => {
      eventBus.removeEventListener(
        EVENTS.WALLETCONNECT.SESSION_STATUS_CHANGED,
        handleSessionChange
      );
    };
  }, [account, pendingConnect]);

  React.useEffect(() => {
    if (account) {
      wallet
        .getWalletConnectSessionStatus(account.address, account.brandName)
        .then((result) => result && setStatus(result));
    }
  }, [account]);

  return { status, errorAccount, currAccount };
};
