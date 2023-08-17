import React from 'react';
import { useLedgerStatus } from './useLedgerStatus';
import { CommonStatusBar } from './CommonStatusBar';
import { LedgerSignal } from './LedgerSignal';
import { useTranslation } from 'react-i18next';

interface Props {
  className?: string;
}

export const LedgerStatusBar: React.FC<Props> = ({ className }) => {
  const { status, content, onClickConnect } = useLedgerStatus();
  const { t } = useTranslation();

  return (
    <CommonStatusBar
      Signal={<LedgerSignal size="small" />}
      className={className}
      onClickButton={onClickConnect}
      ButtonText={
        <>{status === 'DISCONNECTED' && t('component.ConnectStatus.connect')}</>
      }
      Content={content}
    />
  );
};
