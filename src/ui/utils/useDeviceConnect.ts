import { KEYRING_CLASS } from '@/constant';
import React, { useContext } from 'react';
import { useLedgerStatus } from '../component/ConnectStatus/useLedgerStatus';
import { useCommonPopupView, useWallet } from './WalletContext';
import { useCurrentAccount } from '../hooks/backgroundState/useAccount';
import { useImKeyStatus } from '../component/ConnectStatus/useImKeyStatus';
import { Account } from '@/background/service/preference';
import { ApprovalScopeContext } from '@/ui/approval/context';

/**
 * some devices require a connection to the device to sign transactions
 * ledger, walletConnect, gridplus, etc
 */
export const useDeviceConnect = () => {
  const ledgerStatus = useLedgerStatus();
  const imKeyStatus = useImKeyStatus();
  const { activePopup, setAccount } = useCommonPopupView();
  const wallet = useWallet();
  const approvalScope = useContext(ApprovalScopeContext);

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
          activePopup('Ledger', approvalScope?.approval.approvalId);
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
          activePopup('WalletConnect', approvalScope?.approval.approvalId);
          return false;
        }
      } else if (type === KEYRING_CLASS.HARDWARE.IMKEY) {
        if (imKeyStatus.status === 'DISCONNECTED') {
          activePopup('ImKeyPermission', approvalScope?.approval.approvalId);
          return false;
        }
      }

      return true;
    },
    [approvalScope?.approval.approvalId, imKeyStatus, ledgerStatus, wallet]
  );

  return connect;
};
