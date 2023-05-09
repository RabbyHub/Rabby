import { KEYRING_CLASS } from '@/constant';
import React from 'react';
import { ProcessActions, Props as ProcessActionsProps } from './ProcessActions';

export type Props = ProcessActionsProps;

export const ActionGroup: React.FC<ProcessActionsProps> = (props) => {
  const { account } = props;
  return (
    <div>
      {account.type === KEYRING_CLASS.WALLETCONNECT && (
        <ProcessActions {...props} />
      )}
    </div>
  );
};
