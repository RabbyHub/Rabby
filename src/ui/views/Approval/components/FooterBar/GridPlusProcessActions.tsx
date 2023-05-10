import React from 'react';
import { Props } from './ActionsContainer';
import { ProcessActions } from './ProcessActions';
import { useGridPlusStatus } from '@/ui/component/ConnectStatus/useGridPlusStatus';

export const GridPlusProcessActions: React.FC<Props> = (props) => {
  const { disabledProcess } = props;
  const { status } = useGridPlusStatus();

  return (
    <ProcessActions
      {...props}
      disabledProcess={status !== 'CONNECTED' || disabledProcess}
    />
  );
};
