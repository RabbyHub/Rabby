import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { isSameAddress, useWallet } from '@/ui/utils';
import { WALLETCONNECT_SESSION_STATUS_MAP } from '@rabby-wallet/eth-walletconnect-keyring/dist/type';
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
  pendingConnect?: boolean,
  ignoreStore = false
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
  const [isConnect, setIsConnect] = React.useState(false);

  React.useEffect(() => {
    const handleSessionChange = (data: {
      address: string;
      brandName: string;
      realBrandName?: string;
      status: Status;
    }) => {
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
      }

      if (updated) {
        setStatus(updated);
      }

      if (updated === 'CONNECTED') {
        setIsConnect(true);
      } else if (updated === 'DISCONNECTED') {
        setIsConnect(false);
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
    if (account && !ignoreStore) {
      wallet
        .getWalletConnectSessionStatus(account.address, account.brandName)
        .then((result) => {
          if (!result) return;
          if (result === 'DISCONNECTED') {
            setIsConnect(false);
          } else {
            setIsConnect(true);
          }

          setStatus(result);
        });
    }
  }, [account, ignoreStore]);

  const currStatus = React.useMemo(() => {
    if (pendingConnect) {
      if (isConnect) {
        return status;
      }
      return undefined;
    }

    return status;
  }, [status, isConnect, pendingConnect]);

  return { status: currStatus, errorAccount, currAccount };
};
