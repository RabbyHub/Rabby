import React from 'react';
import { Props } from './ActionsContainer';
import { ProcessActions } from './ProcessActions';

export const LedgerProcessActions: React.FC<Props> = (props) => {
  const { disabledProcess } = props;

  return <ProcessActions {...props} disabledProcess={disabledProcess} />;
};
