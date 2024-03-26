import React from 'react';
import { useCommonPopupView } from '@/ui/utils';
import { useTranslation } from 'react-i18next';
import { useImKeyDeviceConnected } from '@/ui/utils/imKey';

export const useImKeyStatus = () => {
  const { activePopup } = useCommonPopupView();
  const hasConnectedImKeyHID = useImKeyDeviceConnected();
  const [content, setContent] = React.useState<string>();

  const status: 'CONNECTED' | 'DISCONNECTED' = React.useMemo(() => {
    return hasConnectedImKeyHID ? 'CONNECTED' : 'DISCONNECTED';
  }, [hasConnectedImKeyHID]);

  const { t } = useTranslation();

  const onClickConnect = () => {
    activePopup('ImKeyPermission');
  };

  React.useEffect(() => {
    if (status === 'DISCONNECTED') {
      setContent(t('component.ConnectStatus.imKeyrNotConnected'));
    } else {
      setContent(t('component.ConnectStatus.imKeyConnected'));
    }
  }, [status]);

  return {
    content,
    onClickConnect,
    status,
  };
};
