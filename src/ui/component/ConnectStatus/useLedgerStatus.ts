import React from 'react';
import { useCommonPopupView, useWallet } from '@/ui/utils';
import { useLedgerDeviceConnected } from '@/utils/ledger';

export const useLedgerStatus = () => {
  const wallet = useWallet();
  const { activePopup } = useCommonPopupView();
  const hasConnectedLedgerHID = useLedgerDeviceConnected();
  const [useLedgerLive, setUseLedgerLive] = React.useState(false);
  const [content, setContent] = React.useState<string>();

  const status: 'CONNECTED' | 'DISCONNECTED' = React.useMemo(() => {
    if (useLedgerLive) {
      return 'CONNECTED';
    }
    return hasConnectedLedgerHID ? 'CONNECTED' : 'DISCONNECTED';
  }, [hasConnectedLedgerHID, useLedgerLive]);

  React.useEffect(() => {
    wallet.isUseLedgerLive().then(setUseLedgerLive);
  }, []);

  const onClickConnect = () => {
    activePopup('Ledger');
  };

  React.useEffect(() => {
    if (status === 'DISCONNECTED') {
      setContent('Ledger is not connected');
    } else {
      setContent('Ledger is connected');
    }
  }, [status]);

  return {
    content,
    onClickConnect,
    status,
  };
};
