import { KEYRING_CLASS } from '@/constant';
import React from 'react';
import { useLedgerStatus } from '../component/ConnectStatus/useLedgerStatus';
import { useCommonPopupView } from './WalletContext';
import { useSessionStatus } from '../component/WalletConnect/useSessionStatus';
import { useCurrentAccount } from '../hooks/backgroundState/useAccount';
import { useImKeyStatus } from '../component/ConnectStatus/useImKeyStatus';

/**
 * some devices require a connection to the device to sign transactions
 * ledger, walletConnect, gridplus, etc
 */
export const useDeviceConnect = () => {
  const ledgerStatus = useLedgerStatus();
  const account = useCurrentAccount();
  const walletConnectStatus = useSessionStatus(account!);
  const imKeyStatus = useImKeyStatus();
  const { activePopup, setAccount } = useCommonPopupView();

  /**
   * @returns {boolean} true if connected, false if not connected and popup is shown
   */
  const connect = React.useCallback(
    async (type: string) => {
      if (type === KEYRING_CLASS.HARDWARE.LEDGER) {
        if (ledgerStatus.status === 'DISCONNECTED') {
          activePopup('Ledger');
          return false;
        }
      } else if (type === KEYRING_CLASS.WALLETCONNECT) {
        if (
          !walletConnectStatus.status ||
          walletConnectStatus.status === 'DISCONNECTED'
        ) {
          if (account) {
            setAccount({
              ...account,
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
    [ledgerStatus, walletConnectStatus, imKeyStatus, account]
  );

  return connect;
};
