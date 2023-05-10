import { KEYRING_CLASS } from '@/constant';
import React from 'react';
import { ProcessActions } from './ProcessActions';
import { SubmitActions } from './SubmitActions';
export { Props } from './ActionsContainer';
import { Props } from './ActionsContainer';
import { WalletConnectProcessActions } from './WalletConnectProcessActions';
import { GridPlusProcessActions } from './GridPlusProcessActions';
import { LedgerProcessActions } from './LedgerProcessActions';

export const ActionGroup: React.FC<Props> = (props) => {
  const { account } = props;

  if (
    account.type === KEYRING_CLASS.PRIVATE_KEY ||
    account.type === KEYRING_CLASS.MNEMONIC ||
    account.type === KEYRING_CLASS.WATCH
  ) {
    return <SubmitActions {...props} />;
  }
  if (account.type === KEYRING_CLASS.WALLETCONNECT) {
    return <WalletConnectProcessActions {...props} />;
  }

  if (account.type === KEYRING_CLASS.HARDWARE.LEDGER) {
    return <LedgerProcessActions {...props} />;
  }

  if (account.type === KEYRING_CLASS.HARDWARE.GRIDPLUS) {
    return <GridPlusProcessActions {...props} />;
  }

  return <ProcessActions {...props} />;
};
