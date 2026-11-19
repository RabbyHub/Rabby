import React from 'react';
import { useCommonPopupView } from '@/ui/utils';
import { useLedgerDeviceConnected } from '@/ui/utils/ledger';
import { useTranslation } from 'react-i18next';

export const useLedgerStatus = () => {
  const { activePopup } = useCommonPopupView();
  const hasConnectedLedgerHID = useLedgerDeviceConnected();

  const status: 'CONNECTED' | 'DISCONNECTED' = React.useMemo(() => {
    return hasConnectedLedgerHID ? 'CONNECTED' : 'DISCONNECTED';
  }, [hasConnectedLedgerHID]);

  const { t } = useTranslation();

  const onClickConnect = () => {
    activePopup('Ledger');
  };

  const content =
    status === 'DISCONNECTED'
      ? t('component.ConnectStatus.ledgerNotConnected')
      : t('component.ConnectStatus.ledgerConnected');

  return {
    content,
    onClickConnect,
    status,
  };
};
