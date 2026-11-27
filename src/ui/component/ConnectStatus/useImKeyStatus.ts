import React from 'react';
import { useCommonPopupView } from '@/ui/utils';
import { useTranslation } from 'react-i18next';
import { useImKeyDeviceConnected } from '@/ui/utils/imKey';

export const useImKeyStatus = () => {
  const { activePopup } = useCommonPopupView();
  const hasConnectedImKeyHID = useImKeyDeviceConnected();

  const status: 'CONNECTED' | 'DISCONNECTED' = React.useMemo(() => {
    return hasConnectedImKeyHID ? 'CONNECTED' : 'DISCONNECTED';
  }, [hasConnectedImKeyHID]);

  const { t } = useTranslation();

  const onClickConnect = () => {
    activePopup('ImKeyPermission');
  };

  const content =
    status === 'DISCONNECTED'
      ? t('component.ConnectStatus.imKeyrNotConnected')
      : t('component.ConnectStatus.imKeyConnected');

  return {
    content,
    onClickConnect,
    status,
  };
};
