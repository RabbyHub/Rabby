import React from 'react';
import { Props } from './ActionsContainer';
import { ProcessActions } from './ProcessActions';
import { useImKeyStatus } from '@/ui/component/ConnectStatus/useImKeyStatus';

export const ImKeyProcessActions: React.FC<Props> = (props) => {
  const { disabledProcess } = props;
  const { status } = useImKeyStatus();

  return (
    <ProcessActions
      {...props}
      disabledProcess={status !== 'CONNECTED' || disabledProcess}
    />
  );
};
