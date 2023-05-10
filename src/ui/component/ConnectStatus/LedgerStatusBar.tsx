import React from 'react';
import { useLedgerStatus } from './useLedgerStatus';
import { CommonStatusBar } from './CommonStatusBar';
import { LedgerSignal } from './LedgerSignal';

interface Props {
  className?: string;
}

export const LedgerStatusBar: React.FC<Props> = ({ className }) => {
  const { status, content, onClickConnect } = useLedgerStatus();

  return (
    <CommonStatusBar
      Signal={<LedgerSignal size="small" />}
      className={className}
      onClickButton={onClickConnect}
      ButtonText={<>{status === 'DISCONNECTED' && 'Connect'}</>}
      Content={content}
    />
  );
};
