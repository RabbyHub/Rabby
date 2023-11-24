import React from 'react';
import { useKeystoneStatus } from './useKeystoneStatus';
import { CommonStatusBar } from './CommonStatusBar';
import { KeystoneSignal } from './KeystoneSignal';
import { useTranslation } from 'react-i18next';

interface Props {
  className?: string;
}

export const KeystoneStatusBar: React.FC<Props> = ({ className }) => {
  const { status, content, onClickConnect } = useKeystoneStatus();
  const { t } = useTranslation();

  return (
    <CommonStatusBar
      Signal={<KeystoneSignal size="small" />}
      className={className}
      onClickButton={onClickConnect}
      ButtonText={
        <>{status === 'DISCONNECTED' && t('component.ConnectStatus.connect')}</>
      }
      Content={content}
    />
  );
};
