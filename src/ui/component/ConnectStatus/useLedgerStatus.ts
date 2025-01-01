import React from 'react';
import { useCommonPopupView } from '@/ui/utils';
import { useLedgerDeviceConnected } from '@/ui/utils/ledger';
import { useTranslation } from 'react-i18next';

export const useLedgerStatus = () => {
  const { activePopup } = useCommonPopupView();
  const hasConnectedLedgerHID = useLedgerDeviceConnected();
  const [content, setContent] = React.useState<string>();

  const status: 'CONNECTED' | 'DISCONNECTED' = React.useMemo(() => {
    return hasConnectedLedgerHID ? 'CONNECTED' : 'DISCONNECTED';
  }, [hasConnectedLedgerHID]);

  const { t } = useTranslation();

  const onClickConnect = () => {
    activePopup('Ledger');
  };

  React.useEffect(() => {
    if (status === 'DISCONNECTED') {
      setContent(t('component.ConnectStatus.ledgerNotConnected'));
    } else {
      setContent(t('component.ConnectStatus.ledgerConnected'));
    }
  }, [status]);

  return {
    content,
    onClickConnect,
    status,
  };
};
