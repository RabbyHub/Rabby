import React from 'react';
import { Props } from './ActionsContainer';
import { ProcessActions } from './ProcessActions';
import { useLedgerStatus } from '@/ui/component/ConnectStatus/useLedgerStatus';

export const LedgerProcessActions: React.FC<Props> = (props) => {
  const { disabledProcess } = props;
  const { status } = useLedgerStatus();

  return (
    <ProcessActions
      {...props}
      disabledProcess={status !== 'CONNECTED' || disabledProcess}
    />
  );
};
