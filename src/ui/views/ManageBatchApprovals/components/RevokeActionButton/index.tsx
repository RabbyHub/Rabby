import { Button } from 'antd';
import { BatchRevokeTaskType } from '../../hooks/useBatchRevokeTask';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { KEYRING_CLASS } from '@/constant';
import { RevokeActionLedgerButton } from './RevokeActionLedgerButton';
import React from 'react';
import { RevokeActionCommonButton } from './RevokeActionCommonButton';

export const RevokeActionButton: React.FC<{
  task: BatchRevokeTaskType;
  onDone?: () => void;
}> = ({ task, onDone }) => {
  const account = useCurrentAccount();

  if (account?.type === KEYRING_CLASS.HARDWARE.LEDGER) {
    return <RevokeActionLedgerButton task={task} onDone={onDone} />;
  }

  return <RevokeActionCommonButton task={task} onDone={onDone} />;
};
