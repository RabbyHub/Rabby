import { KEYRING_CLASS } from '@/constant';
import React from 'react';
import { useLedgerStatus } from '../component/ConnectStatus/useLedgerStatus';
import { useCommonPopupView, useWallet } from './WalletContext';
import { useCurrentAccount } from '../hooks/backgroundState/useAccount';
import { useImKeyStatus } from '../component/ConnectStatus/useImKeyStatus';
import { Account } from '@/background/service/preference';

/**
 * some devices require a connection to the device to sign transactions
 * ledger, walletConnect, gridplus, etc
 */
export const useDeviceConnect = () => {
  const ledgerStatus = useLedgerStatus();
  const imKeyStatus = useImKeyStatus();
  const { activePopup, setAccount } = useCommonPopupView();
  const wallet = useWallet();

  /**
   * @returns {boolean} true if connected, false if not connected and popup is shown
   */
  const connect = React.useCallback(
    async (data: any, currentAccount: Account) => {
      if (!data) {
        return true;
      }
      const { type, account, isGnosis } = data;

      if (type === KEYRING_CLASS.HARDWARE.LEDGER) {
        if (ledgerStatus.status === 'DISCONNECTED') {
          activePopup('Ledger');
          return false;
        }
      } else if (type === KEYRING_CLASS.WALLETCONNECT) {
        const acc = isGnosis ? account : currentAccount;
        const status = await wallet.getWalletConnectSessionStatus(
          acc.address,
          acc.brandName
        );

        if (!status || status === 'DISCONNECTED') {
          if (acc) {
            setAccount({
              ...acc,
              type,
            });
          }
          activePopup('WalletConnect');
          return false;
        }
      } else if (type === KEYRING_CLASS.HARDWARE.IMKEY) {
        if (imKeyStatus.status === 'DISCONNECTED') {
          activePopup('ImKeyPermission');
          return false;
        }
      }

      return true;
    },
    [ledgerStatus, imKeyStatus]
  );

  return connect;
};
