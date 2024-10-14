import { KEYRING_CLASS } from '@/constant';
import React from 'react';
import { useLedgerStatus } from '../component/ConnectStatus/useLedgerStatus';
import { useCommonPopupView } from './WalletContext';

/**
 * some devices require a connection to the device to sign transactions
 * ledger, walletConnect, gridplus, etc
 */
export const useDeviceConnect = () => {
  const ledgerStatus = useLedgerStatus();
  const { activePopup } = useCommonPopupView();

  const connect = React.useCallback(
    (type: string) => {
      if (type === KEYRING_CLASS.HARDWARE.LEDGER) {
        if (ledgerStatus.status === 'DISCONNECTED') {
          activePopup('Ledger');
          return false;
        }
      }

      return true;
    },
    [ledgerStatus]
  );

  return connect;
};
