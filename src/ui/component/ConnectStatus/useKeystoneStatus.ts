import React from 'react';
import { useCommonPopupView } from '@/ui/utils';
import { useKeystoneDeviceConnected } from '@/ui/utils/keystone';
import { useTranslation } from 'react-i18next';

export const useKeystoneStatus = () => {
  const { activePopup } = useCommonPopupView();
  const hasConnected = useKeystoneDeviceConnected();

  const status: 'CONNECTED' | 'DISCONNECTED' = React.useMemo(() => {
    return hasConnected ? 'CONNECTED' : 'DISCONNECTED';
  }, [hasConnected]);

  const { t } = useTranslation();

  const onClickConnect = () => {
    activePopup('Keystone');
  };

  const content =
    status === 'DISCONNECTED'
      ? t('component.ConnectStatus.keystoneNotConnected')
      : t('component.ConnectStatus.keystoneConnected');

  return {
    content,
    onClickConnect,
    status,
  };
};
