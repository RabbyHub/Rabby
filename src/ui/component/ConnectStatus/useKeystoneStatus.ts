import React from 'react';
import { useCommonPopupView } from '@/ui/utils';
import { useKeystoneDeviceConnected } from '@/ui/utils/keystone';
import { useTranslation } from 'react-i18next';

export const useKeystoneStatus = () => {
  const { activePopup } = useCommonPopupView();
  const hasConnected = useKeystoneDeviceConnected();
  const [content, setContent] = React.useState<string>();

  const status: 'CONNECTED' | 'DISCONNECTED' = React.useMemo(() => {
    return hasConnected ? 'CONNECTED' : 'DISCONNECTED';
  }, [hasConnected]);

  const { t } = useTranslation();

  const onClickConnect = () => {
    activePopup('Keystone');
  };

  React.useEffect(() => {
    if (status === 'DISCONNECTED') {
      setContent(t('component.ConnectStatus.keystoneNotConnected'));
    } else {
      setContent(t('component.ConnectStatus.keystoneConnected'));
    }
  }, [status]);

  return {
    content,
    onClickConnect,
    status,
  };
};
